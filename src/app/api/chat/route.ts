import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { conversationId, message } = await req.json();

  if (!conversationId || !message) {
    return new Response('Missing conversationId or message', { status: 400 });
  }

  // Fetch conversation with all related data
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      agent: true,
      messages: { orderBy: { createdAt: 'asc' } },
      documents: { include: { document: true } },
      project: true,
    },
  });

  if (!conversation) return new Response('Conversation not found', { status: 404 });

  // Verify project ownership
  if (conversation.project.userId !== session.user.id) {
    return new Response('Forbidden', { status: 403 });
  }

  // Save user message
  await prisma.message.create({
    data: {
      role: 'user',
      content: message,
      conversationId,
      userId: session.user.id,
    },
  });

  // Build docs context
  const docsContext = conversation.documents
    .filter((cd) => cd.document.extractedText)
    .map((cd) => `### Documento: ${cd.document.name}\n${cd.document.extractedText}`)
    .join('\n\n---\n\n');

  const finalSystemPrompt = docsContext
    ? `${conversation.agent.systemPrompt}\n\n---\n\n## Documentos de Referência do Projeto\n\n${docsContext}`
    : conversation.agent.systemPrompt;

  // Build history (context management: keep first 2 + last N messages)
  const allMessages = conversation.messages;
  let historyMessages = allMessages;

  if (allMessages.length > 20) {
    const first2 = allMessages.slice(0, 2);
    const lastN = allMessages.slice(-16);
    historyMessages = [...first2, ...lastN];
  }

  const history = historyMessages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  // Add current message
  history.push({ role: 'user', content: message });

  // Get API keys
  const settings = await prisma.settings.findUnique({ where: { id: 'global' } });

  let apiKey: string | null = null;
  if (conversation.agent.provider === 'anthropic' && settings?.anthropicApiKey) {
    try {
      apiKey = decrypt(settings.anthropicApiKey);
    } catch {}
  } else if (conversation.agent.provider === 'openai' && settings?.openaiApiKey) {
    try {
      apiKey = decrypt(settings.openaiApiKey);
    } catch {}
  }

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'API key not configured. Please add it in Settings.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  let fullResponse = '';

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: data })}\n\n`));
      };

      const sendDone = () => {
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      };

      const sendError = (error: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error })}\n\n`));
      };

      try {
        if (conversation.agent.provider === 'anthropic') {
          const anthropic = new Anthropic({ apiKey });

          const anthropicStream = await anthropic.messages.stream({
            model: conversation.agent.model,
            max_tokens: conversation.agent.maxTokens,
            temperature: conversation.agent.temperature,
            system: finalSystemPrompt,
            messages: history,
          });

          for await (const chunk of anthropicStream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              fullResponse += chunk.delta.text;
              send(chunk.delta.text);
            }
          }
        } else if (conversation.agent.provider === 'openai') {
          const openai = new OpenAI({ apiKey });

          const openaiStream = await openai.chat.completions.create({
            model: conversation.agent.model,
            temperature: conversation.agent.temperature,
            max_tokens: conversation.agent.maxTokens,
            stream: true,
            messages: [
              { role: 'system', content: finalSystemPrompt },
              ...history,
            ],
          });

          for await (const chunk of openaiStream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullResponse += content;
              send(content);
            }
          }
        }

        // Save assistant response
        if (fullResponse) {
          await prisma.message.create({
            data: {
              role: 'assistant',
              content: fullResponse,
              conversationId,
            },
          });
        }

        sendDone();
      } catch (error: unknown) {
        console.error('Chat error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        sendError(message);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
