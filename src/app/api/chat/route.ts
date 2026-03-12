import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { calculateCost } from '@/lib/pricing';
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

  if (!conversation) return new Response(JSON.stringify({ error: 'Conversation not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  // Verify project ownership (admin can access any project)
  const isAdmin = session.user.role === 'admin';
  if (!isAdmin && conversation.project.userId !== session.user.id) {
    return new Response('Forbidden', { status: 403 });
  }

  // Check monthly token limit for the project owner
  const ownerId = conversation.project.userId;
  const owner = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { tokenLimitMonthly: true },
  });

  if (owner?.tokenLimitMonthly) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usage = await prisma.message.aggregate({
      where: {
        conversation: { project: { userId: ownerId } },
        createdAt: { gte: startOfMonth },
      },
      _sum: { tokenCount: true },
    });

    const used = usage._sum.tokenCount || 0;
    if (used >= owner.tokenLimitMonthly) {
      return new Response(
        JSON.stringify({ error: 'Limite de tokens mensais atingido. Entre em contato com o administrador.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
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
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheCreationTokens = 0; // Anthropic only: tokens written to cache
  let cacheReadTokens = 0;     // Anthropic: cache hits | OpenAI: cached subset of inputTokens

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

          const anthropicStream = anthropic.messages.stream({
            model: conversation.agent.model,
            max_tokens: conversation.agent.maxTokens,
            temperature: conversation.agent.temperature,
            system: [
              {
                type: 'text',
                text: finalSystemPrompt,
                cache_control: { type: 'ephemeral' },
              },
            ],
            messages: history,
          });

          for await (const chunk of anthropicStream) {
            if (chunk.type === 'message_start') {
              const u = chunk.message.usage as {
                input_tokens?: number;
                cache_creation_input_tokens?: number;
                cache_read_input_tokens?: number;
              };
              inputTokens         = u.input_tokens                  || 0;
              cacheCreationTokens = u.cache_creation_input_tokens   || 0;
              cacheReadTokens     = u.cache_read_input_tokens       || 0;
            }
            if (chunk.type === 'message_delta' && 'usage' in chunk) {
              outputTokens = (chunk as { usage?: { output_tokens?: number } }).usage?.output_tokens || 0;
            }
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

          // GPT-5+ family uses the Responses API; GPT-4 and below use Chat Completions
          const useResponsesApi = conversation.agent.model.startsWith('gpt-5');

          if (useResponsesApi) {
            const responsesStream = await openai.responses.create({
              model: conversation.agent.model,
              instructions: finalSystemPrompt,
              input: history,
              stream: true,
            });

            for await (const event of responsesStream) {
              if (event.type === 'response.output_text.delta') {
                fullResponse += event.delta;
                send(event.delta);
              }
              if (event.type === 'response.completed') {
                const usage = (event as { response?: { usage?: {
                  input_tokens?: number;
                  output_tokens?: number;
                  input_tokens_details?: { cached_tokens?: number };
                } } }).response?.usage;
                inputTokens     = usage?.input_tokens || 0;
                outputTokens    = usage?.output_tokens || 0;
                cacheReadTokens = usage?.input_tokens_details?.cached_tokens || 0;
              }
            }
          } else {
            const openaiStream = await openai.chat.completions.create({
              model: conversation.agent.model,
              temperature: conversation.agent.temperature,
              max_tokens: conversation.agent.maxTokens,
              stream: true,
              stream_options: { include_usage: true },
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
              if (chunk.usage) {
                inputTokens     = chunk.usage.prompt_tokens || 0;
                outputTokens    = chunk.usage.completion_tokens || 0;
                cacheReadTokens = (chunk.usage as { prompt_tokens_details?: { cached_tokens?: number } })
                  .prompt_tokens_details?.cached_tokens || 0;
              }
            }
          }
        }

        // Save assistant response with token counts and exact cost at this point in time
        if (fullResponse) {
          const totalTokens = inputTokens + outputTokens;
          const cost = calculateCost(
            conversation.agent.model,
            inputTokens,
            outputTokens,
            cacheCreationTokens,
            cacheReadTokens,
          );
          await prisma.message.create({
            data: {
              role: 'assistant',
              content: fullResponse,
              conversationId,
              inputTokens:         inputTokens         || null,
              outputTokens:        outputTokens        || null,
              tokenCount:          totalTokens         || null,
              cacheCreationTokens: cacheCreationTokens || null,
              cacheReadTokens:     cacheReadTokens     || null,
              cost:                cost                || null,
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
