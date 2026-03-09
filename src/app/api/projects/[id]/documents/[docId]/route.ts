import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify project ownership
  const project = await prisma.project.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const document = await prisma.document.findFirst({
    where: { id: params.docId, projectId: params.id },
  });
  if (!document) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

  // Delete file
  try {
    await unlink(join('/app/uploads', params.id, document.filename));
  } catch {}

  await prisma.document.delete({ where: { id: params.docId } });

  return NextResponse.json({ success: true });
}
