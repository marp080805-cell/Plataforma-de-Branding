import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

async function extractText(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
  try {
    if (mimeType === 'application/pdf') {
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);
      return data.text;
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
