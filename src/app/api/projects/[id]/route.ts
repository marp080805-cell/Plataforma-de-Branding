import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await prisma.project.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      documents: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  return NextResponse.json(project);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, description, color } = await req.json();

  const project = await prisma.project.updateMany({
    where: { id: params.id, userId: session.user.id },
    data: { name, description, color },
  });

  if (project.count === 0) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Delete uploaded files
  const documents = await prisma.document.findMany({ where: { projectId: params.id } });

  const fs = await import('fs/promises');
  const path = await import('path');

  for (const doc of documents) {
    try {
      const filePath = path.join('/app/uploads', params.id, doc.filename);
      await fs.unlink(filePath);
    } catch {}
  }

  try {
    const dirPath = path.join('/app/uploads', params.id);
    await fs.rmdir(dirPath);
  } catch {}

  const deleted = await prisma.project.deleteMany({
    where: { id: params.id, userId: session.user.id },
  });

  if (deleted.count === 0) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}
