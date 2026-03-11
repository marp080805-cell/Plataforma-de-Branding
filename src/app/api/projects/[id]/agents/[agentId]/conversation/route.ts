import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; agentId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const isAdmin = session.user.role === 'admin';
  const project = await prisma.project.findFirst({
    where: { id: params.id, ...(isAdmin ? {} : { userId: session.user.id }) },
  });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  let conversation = await prisma.conversation.findUnique({
    where: { projectId_agentId: { projectId: params.id, agentId: params.agentId } },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      documents: { include: { document: true } },
      agent: true,
    },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        projectId: params.id,
        agentId: params.agentId,
      },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        documents: { include: { document: true } },
        agent: true,
      },
    });
  }

  return NextResponse.json(conversation);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; agentId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { documentIds } = await req.json();

  const isAdmin = session.user.role === 'admin';
  const project = await prisma.project.findFirst({
    where: { id: params.id, ...(isAdmin ? {} : { userId: session.user.id }) },
  });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  let conversation = await prisma.conversation.findUnique({
    where: { projectId_agentId: { projectId: params.id, agentId: params.agentId } },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { projectId: params.id, agentId: params.agentId },
    });
  }

  // Update document selection
  await prisma.conversationDocument.deleteMany({
    where: { conversationId: conversation.id },
  });

  if (documentIds && documentIds.length > 0) {
    await prisma.conversationDocument.createMany({
      data: documentIds.map((docId: string) => ({
        conversationId: conversation!.id,
        documentId: docId,
      })),
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; agentId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const isAdmin = session.user.role === 'admin';
  const project = await prisma.project.findFirst({
    where: { id: params.id, ...(isAdmin ? {} : { userId: session.user.id }) },
  });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  await prisma.conversation.deleteMany({
    where: { projectId: params.id, agentId: params.agentId },
  });

  return NextResponse.json({ success: true });
}
