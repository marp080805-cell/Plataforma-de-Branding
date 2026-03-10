import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// Modelos escolhidos por custo-benefício:
// PDFs  → claude-haiku-4-5 ($1/$5 MTok): único com suporte nativo a PDF, suficiente para OCR
// Imagens → gpt-4o-mini ($0.15/$0.60 MTok): 7x mais barato que Haiku, excelente para OCR visual
//           Fallback: claude-haiku-4-5 se OpenAI não estiver configurada
const PDF_OCR_MODEL = 'claude-haiku-4-5-20251001';
const IMAGE_OCR_MODEL = 'gpt-4o-mini';

async function getSettings() {
  return prisma.settings.findUnique({ where: { id: 'global' } });
}

async function ocrPdfWithClaude(buffer: Buffer): Promise<string> {
  const settings = await getSettings();
  if (!settings?.anthropicApiKey) return '';
  try {
    const anthropic = new Anthropic({ apiKey: decrypt(settings.anthropicApiKey) });
    const response = await anthropic.messages.create({
      model: PDF_OCR_MODEL,
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: buffer.toString('base64') },
            },
            {
              type: 'text',
              text: 'Extraia e retorne TODO o conteúdo textual deste documento PDF. Preserve a estrutura (títulos, listas, tabelas). Retorne apenas o texto extraído, sem comentários.',
            },
          ],
        },
      ],
    });
    const block = response.content[0];
    return block.type === 'text' ? block.text : '';
  } catch (err) {
    console.error('Claude PDF OCR error:', err);
    return '';
  }
}

async function ocrImageWithOpenAI(buffer: Buffer, mimeType: string): Promise<string> {
  const settings = await getSettings();
  if (!settings?.openaiApiKey) return '';
  try {
    const openai = new OpenAI({ apiKey: decrypt(settings.openaiApiKey) });
    const base64 = buffer.toString('base64');
    const response = await openai.chat.completions.create({
      model: IMAGE_OCR_MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' },
            },
            {
              type: 'text',
              text: 'Extraia e descreva todo o conteúdo textual e visual relevante desta imagem. Inclua textos, títulos, legendas, dados de tabelas e qualquer informação visível. Retorne apenas o conteúdo extraído, sem comentários.',
            },
          ],
        },
      ],
    });
    return response.choices[0]?.message?.content ?? '';
  } catch (err) {
    console.error('OpenAI image OCR error:', err);
    return '';
  }
}

async function ocrImageWithClaude(buffer: Buffer, mimeType: string): Promise<string> {
  const settings = await getSettings();
  if (!settings?.anthropicApiKey) return '';
  try {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const mediaType = validTypes.includes(mimeType) ? mimeType : 'image/jpeg';
    const anthropic = new Anthropic({ apiKey: decrypt(settings.anthropicApiKey) });
    const response = await anthropic.messages.create({
      model: PDF_OCR_MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
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
          ],
        },
      ],
    });
    const block = response.content[0];
    return block.type === 'text' ? block.text : '';
  } catch (err) {
    console.error('Claude image OCR error:', err);
    return '';
  }
}

async function extractText(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
  try {
    // --- PDF ---
    if (mimeType === 'application/pdf') {
      // Tenta extração direta (PDFs com camada de texto — grátis, sem API)
      try {
        const pdfParse = (await import('pdf-parse')).default;
        const data = await pdfParse(buffer);
        const text = data.text?.trim() ?? '';
        if (text.length > 100) return text;
      } catch (err) {
        console.error('pdf-parse error:', err);
      }
      // Fallback OCR: Claude Haiku (único modelo com suporte nativo a PDF)
      return await ocrPdfWithClaude(buffer);
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
    // Tenta OpenAI gpt-4o-mini primeiro (mais barato), depois Claude Haiku como fallback
    if (mimeType.startsWith('image/')) {
      const text = await ocrImageWithOpenAI(buffer, mimeType);
      if (text) return text;
      return await ocrImageWithClaude(buffer, mimeType);
    }
  } catch (err) {
    console.error('Text extraction error:', err);
  }
  return '';
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await prisma.project.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split('.').pop() || '';
  const filename = `${randomUUID()}.${ext}`;

  const uploadDir = join('/app/uploads', params.id);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(join(uploadDir, filename), buffer);

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
