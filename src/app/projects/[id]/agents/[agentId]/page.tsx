import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/header';
import { ChatClient } from './chat-client';

export default async function AgentChatPage({
  params,
}: {
  params: { id: string; agentId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const project = await prisma.project.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { documents: { orderBy: { createdAt: 'desc' } } },
  });
  if (!project) notFound();

  const agent = await prisma.agent.findUnique({ where: { id: params.agentId } });
  if (!agent || !agent.isActive) notFound();

  let conversation = await prisma.conversation.findUnique({
    where: { projectId_agentId: { projectId: params.id, agentId: params.agentId } },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      documents: { select: { documentId: true } },
    },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { projectId: params.id, agentId: params.agentId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        documents: { select: { documentId: true } },
      },
    });
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <Header />
      <ChatClient
        project={project}
        agent={agent}
        conversation={conversation}
        initialDocuments={project.documents}
        selectedDocumentIds={conversation.documents.map((d) => d.documentId)}
      />
    </div>
  );
}
