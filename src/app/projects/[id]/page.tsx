import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/header';
import { ProjectClient } from './project-client';

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const project = await prisma.project.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { documents: { orderBy: { createdAt: 'desc' } } },
  });

  if (!project) notFound();

  const agents = await prisma.agent.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  const conversationsWithMessages = await prisma.conversation.findMany({
    where: { projectId: params.id },
    include: { _count: { select: { messages: true } } },
  });

  const agentsWithStatus = agents.map((agent) => {
    const conv = conversationsWithMessages.find((c) => c.agentId === agent.id);
    return {
      ...agent,
      hasConversation: conv ? conv._count.messages > 0 : false,
    };
  });

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      <ProjectClient
        project={{
          ...project,
          documents: project.documents.map((d) => ({
            ...d,
            createdAt: d.createdAt.toISOString(),
          })),
        }}
        agents={agentsWithStatus}
      />
    </div>
  );
}
