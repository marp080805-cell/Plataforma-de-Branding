import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateCost } from '@/lib/pricing';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') return null;
  return session;
}

function getDateFilter(
  period: string,
  startDate: string | null,
  endDate: string | null,
): { gte?: Date; lte?: Date } | undefined {
  if (period === 'custom') {
    if (!startDate && !endDate) return undefined;
    const filter: { gte?: Date; lte?: Date } = {};
    if (startDate) filter.gte = new Date(startDate + 'T00:00:00');
    if (endDate) {
      const end = new Date(endDate + 'T23:59:59.999');
      filter.lte = end;
    }
    return filter;
  }
  const now = new Date();
  if (period === 'month') return { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
  if (period === '30d') return { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
  if (period === '7d') return { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
  return undefined;
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || 'month';
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const dateFilter = getDateFilter(period, startDate, endDate);
  const dateWhere = dateFilter ? { createdAt: dateFilter } : {};

  const messages = await prisma.message.findMany({
    where: {
      role: 'assistant',
      ...dateWhere,
    },
    select: {
      inputTokens: true,
      outputTokens: true,
      tokenCount: true,
      createdAt: true,
      conversation: {
        select: {
          agentId: true,
          agent: { select: { name: true, model: true } },
          projectId: true,
          project: {
            select: {
              name: true,
              userId: true,
              user: { select: { id: true, name: true, email: true, tokenLimitMonthly: true } },
            },
          },
        },
      },
    },
  });

  let totalInput = 0, totalOutput = 0, totalCost = 0;

  const userMap = new Map<string, {
    userId: string; name: string; email: string; tokenLimitMonthly: number | null;
    inputTokens: number; outputTokens: number; cost: number; messages: number;
  }>();

  const projectMap = new Map<string, {
    projectId: string; name: string; ownerName: string; ownerId: string;
    inputTokens: number; outputTokens: number; cost: number; messages: number;
  }>();

  const agentMap = new Map<string, {
    agentId: string; name: string; model: string;
    inputTokens: number; outputTokens: number; cost: number; messages: number;
  }>();

  const dailyMap = new Map<string, { date: string; inputTokens: number; outputTokens: number; cost: number }>();

  // Drill-down: userId -> projectId -> data
  const userProjectsMap = new Map<string, Map<string, {
    projectId: string; name: string;
    inputTokens: number; outputTokens: number; cost: number; messages: number;
  }>>();

  // Drill-down: projectId -> agentId -> data
  const projectAgentsMap = new Map<string, Map<string, {
    agentId: string; name: string; model: string;
    inputTokens: number; outputTokens: number; cost: number; messages: number;
  }>>();

  for (const msg of messages) {
    const inp = msg.inputTokens || 0;
    const out = msg.outputTokens || 0;
    const model = msg.conversation.agent?.model || '';
    const cost = calculateCost(model, inp, out);

    totalInput += inp;
    totalOutput += out;
    totalCost += cost;

    const uid = msg.conversation.project.userId;
    const pid = msg.conversation.projectId;
    const aid = msg.conversation.agentId || '';

    // User
    const u = userMap.get(uid) ?? {
      userId: uid,
      name: msg.conversation.project.user.name,
      email: msg.conversation.project.user.email,
      tokenLimitMonthly: msg.conversation.project.user.tokenLimitMonthly,
      inputTokens: 0, outputTokens: 0, cost: 0, messages: 0,
    };
    u.inputTokens += inp; u.outputTokens += out; u.cost += cost; u.messages += 1;
    userMap.set(uid, u);

    // Project
    const p = projectMap.get(pid) ?? {
      projectId: pid,
      name: msg.conversation.project.name,
      ownerName: msg.conversation.project.user.name,
      ownerId: uid,
      inputTokens: 0, outputTokens: 0, cost: 0, messages: 0,
    };
    p.inputTokens += inp; p.outputTokens += out; p.cost += cost; p.messages += 1;
    projectMap.set(pid, p);

    // Agent
    if (aid) {
      const a = agentMap.get(aid) ?? {
        agentId: aid,
        name: msg.conversation.agent?.name || 'Desconhecido',
        model,
        inputTokens: 0, outputTokens: 0, cost: 0, messages: 0,
      };
      a.inputTokens += inp; a.outputTokens += out; a.cost += cost; a.messages += 1;
      agentMap.set(aid, a);
    }

    // User -> Projects
    if (!userProjectsMap.has(uid)) userProjectsMap.set(uid, new Map());
    const uProjs = userProjectsMap.get(uid)!;
    const up = uProjs.get(pid) ?? {
      projectId: pid, name: msg.conversation.project.name,
      inputTokens: 0, outputTokens: 0, cost: 0, messages: 0,
    };
    up.inputTokens += inp; up.outputTokens += out; up.cost += cost; up.messages += 1;
    uProjs.set(pid, up);

    // Project -> Agents
    if (aid) {
      if (!projectAgentsMap.has(pid)) projectAgentsMap.set(pid, new Map());
      const pAgents = projectAgentsMap.get(pid)!;
      const pa = pAgents.get(aid) ?? {
        agentId: aid,
        name: msg.conversation.agent?.name || 'Desconhecido',
        model,
        inputTokens: 0, outputTokens: 0, cost: 0, messages: 0,
      };
      pa.inputTokens += inp; pa.outputTokens += out; pa.cost += cost; pa.messages += 1;
      pAgents.set(aid, pa);
    }

    // Daily
    if (dateFilter) {
      const dateKey = msg.createdAt.toISOString().slice(0, 10);
      const d = dailyMap.get(dateKey) ?? { date: dateKey, inputTokens: 0, outputTokens: 0, cost: 0 };
      d.inputTokens += inp; d.outputTokens += out; d.cost += cost;
      dailyMap.set(dateKey, d);
    }
  }

  // Monthly usage per user for limit bars (always current month regardless of filter)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthlyRaw = await prisma.message.groupBy({
    by: ['conversationId'],
    where: { role: 'assistant', createdAt: { gte: startOfMonth } },
    _sum: { tokenCount: true },
  });

  const convIds = monthlyRaw.map((r) => r.conversationId);
  const convs = convIds.length
    ? await prisma.conversation.findMany({
        where: { id: { in: convIds } },
        select: { id: true, project: { select: { userId: true } } },
      })
    : [];

  const monthlyByUser = new Map<string, number>();
  for (const r of monthlyRaw) {
    const conv = convs.find((c) => c.id === r.conversationId);
    if (!conv) continue;
    const uid = conv.project.userId;
    monthlyByUser.set(uid, (monthlyByUser.get(uid) || 0) + (r._sum.tokenCount || 0));
  }

  const byUser = Array.from(userMap.values())
    .map((u) => ({ ...u, monthlyTokensUsed: monthlyByUser.get(u.userId) || 0 }))
    .sort((a, b) => b.cost - a.cost);

  // Serialize nested maps for JSON
  const userProjects: Record<string, Array<{
    projectId: string; name: string;
    inputTokens: number; outputTokens: number; cost: number; messages: number;
  }>> = {};
  for (const [uid, projMap] of userProjectsMap) {
    userProjects[uid] = Array.from(projMap.values()).sort((a, b) => b.cost - a.cost);
  }

  const projectAgents: Record<string, Array<{
    agentId: string; name: string; model: string;
    inputTokens: number; outputTokens: number; cost: number; messages: number;
  }>> = {};
  for (const [pid, aMap] of projectAgentsMap) {
    projectAgents[pid] = Array.from(aMap.values()).sort((a, b) => b.cost - a.cost);
  }

  return NextResponse.json({
    summary: {
      totalInputTokens: totalInput,
      totalOutputTokens: totalOutput,
      totalTokens: totalInput + totalOutput,
      totalCost,
      totalMessages: messages.length,
    },
    byUser,
    byProject: Array.from(projectMap.values()).sort((a, b) => b.cost - a.cost),
    byAgent: Array.from(agentMap.values()).sort((a, b) => b.cost - a.cost),
    userProjects,
    projectAgents,
    daily: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    period,
  });
}
