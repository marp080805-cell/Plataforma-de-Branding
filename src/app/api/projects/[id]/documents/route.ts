import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';

async function extractTextFromPdfWithVision(buffer: Buffer): Promise<string> {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
    if (!settings?.anthropicApiKey) return '';

    const apiKey = decrypt(settings.anthropicApiKey);
    const anthropic = new Anthropic({ apiKey });

    const base64pdf = buffer.toString('base64');
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64pdf,
              },
            },
            {
              type: 'text',
              text: 'Extraia e retorne TODO o conteúdo textual deste documento PDF. Retorne apenas o texto extraído, sem comentários ou formatação adicional.',
            },
          ],
        },
      ],
    });

    const content = response.content[0];
    return content.type === 'text' ? content.text : '';
  } catch (err) {
    console.error('Claude Vision OCR error:', err);
    return '';
  }
}

async function extractText(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
  try {
    if (mimeType === 'application/pdf') {
      // Tenta extração direta de texto (PDFs com camada de texto)
      try {
        const pdfParse = (await import('pdf-parse')).default;
        const data = await pdfParse(buffer);
        const text = data.text?.trim() ?? '';
        if (text.length > 100) return text;
      } catch (err) {
        console.error('pdf-parse error:', err);
      }

      // Fallback: Claude Vision para PDFs escaneados/baseados em imagem
      return await extractTextFromPdfWithVision(buffer);
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      filename.endsWith('.docx')
    ) {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } else if (mimeType === 'text/plain' || filename.endsWith('.txt') || filename.endsWith('.md')) {
      return buffer.toString('utf-8');
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
