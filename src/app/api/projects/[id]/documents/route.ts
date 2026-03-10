import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';

// OCR_MODEL: Sonnet 4.6 escolhido intencionalmente sobre Haiku —
// a extração acontece uma única vez por documento e fica permanente no banco.
// Precisão > economia aqui: layouts complexos, tabelas e scans de baixa qualidade
// exigem um modelo mais capaz.
const OCR_MODEL = 'claude-sonnet-4-6';

async function getAnthropicClient(): Promise<Anthropic | null> {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
    if (!settings?.anthropicApiKey) return null;
    return new Anthropic({ apiKey: decrypt(settings.anthropicApiKey) });
  } catch {
    return null;
  }
}

async function extractTextWithVision(
  anthropic: Anthropic,
  content: Anthropic.MessageParam['content']
): Promise<string> {
  const response = await anthropic.messages.create({
    model: OCR_MODEL,
    max_tokens: 8192,
    messages: [{ role: 'user', content }],
  });
  const block = response.content[0];
  return block.type === 'text' ? block.text : '';
}

async function extractText(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
  try {
    // --- PDF ---
    if (mimeType === 'application/pdf') {
      // Tenta extração direta (PDFs com camada de texto — rápido, sem custo de API)
      try {
        const pdfParse = (await import('pdf-parse')).default;
        const data = await pdfParse(buffer);
        const text = data.text?.trim() ?? '';
        if (text.length > 100) return text;
      } catch (err) {
        console.error('pdf-parse error:', err);
      }

      // Fallback: Claude Vision para PDFs escaneados/baseados em imagem
      const anthropic = await getAnthropicClient();
      if (!anthropic) return '';
      return await extractTextWithVision(anthropic, [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: buffer.toString('base64') },
        },
        {
          type: 'text',
          text: 'Extraia e retorne TODO o conteúdo textual deste documento PDF. Preserve a estrutura (títulos, listas, tabelas). Retorne apenas o texto extraído, sem comentários.',
        },
      ]);
    }

    // --- DOCX ---
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      filename.endsWith('.docx')
    ) {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    // --- TXT / MD ---
    if (mimeType === 'text/plain' || filename.endsWith('.txt') || filename.endsWith('.md')) {
      return buffer.toString('utf-8');
    }

    // --- Imagens (PNG, JPG, WEBP, GIF) ---
    if (mimeType.startsWith('image/')) {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const mediaType = validTypes.includes(mimeType) ? mimeType : 'image/jpeg';

      const anthropic = await getAnthropicClient();
      if (!anthropic) return '';
      return await extractTextWithVision(anthropic, [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: buffer.toString('base64'),
          },
        },
        {
          type: 'text',
          text: 'Extraia e descreva todo o conteúdo textual e visual relevante desta imagem. Inclua textos, títulos, legendas, dados de tabelas e qualquer informação visível. Retorne apenas o conteúdo extraído, sem comentários.',
        },
      ]);
    }
  } catch (err) {
    console.error('Text extraction error:', err);
  }
  return '';
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify project ownership
  const project = await prisma.project.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  // 20MB limit
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split('.').pop() || '';
  const filename = `${randomUUID()}.${ext}`;

  // Save file
  const uploadDir = join('/app/uploads', params.id);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(join(uploadDir, filename), buffer);

  // Extract text
  const extractedText = await extractText(buffer, file.type, file.name);

  const document = await prisma.document.create({
    data: {
      name: file.name,
      filename,
      mimeType: file.type,
      size: file.size,
      extractedText: extractedText || null,
      projectId: params.id,
    },
  });

  return NextResponse.json(document, { status: 201 });
}
