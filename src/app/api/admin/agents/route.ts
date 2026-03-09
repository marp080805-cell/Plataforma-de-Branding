import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const agents = await prisma.agent.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  return NextResponse.json(agents);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const data = await req.json();
  const { name, description, icon, systemPrompt, provider, model, temperature, maxTokens, isActive, sortOrder } = data;

  if (!name || !systemPrompt) {
    return NextResponse.json({ error: 'Name and system prompt are required' }, { status: 400 });
  }

  const lastAgent = await prisma.agent.findFirst({ orderBy: { sortOrder: 'desc' } });
  const nextSortOrder = (lastAgent?.sortOrder ?? -1) + 1;

  const agent = await prisma.agent.create({
    data: {
      name,
      description: description || '',
      icon: icon || 'brain',
      systemPrompt,
      provider: provider || 'anthropic',
      model: model || 'claude-sonnet-4-20250514',
      temperature: temperature ?? 0.7,
      maxTokens: maxTokens ?? 4096,
      isActive: isActive ?? true,
      sortOrder: sortOrder ?? nextSortOrder,
    },
  });

  return NextResponse.json(agent, { status: 201 });
}
