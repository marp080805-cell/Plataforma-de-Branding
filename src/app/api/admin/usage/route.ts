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

function getDateFilter(period: string): Date | undefined {
  const now = new Date();
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  if (period === '30d') {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  if (period === '7d') {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  return undefined; // all time
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || 'month';
  const since = getDateFilter(period);
  const dateWhere = since ? { createdAt: { gte: since } } : {};

  // All assistant messages with token data in the period (only assistant messages have token counts)
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

  // Summary
  let totalInput = 0;
  let totalOutput = 0;
  let totalCost = 0;

  // By user
  const userMap = new Map<string, {
    userId: string; name: string; email: string; tokenLimitMonthly: number | null;
    inputTokens: number; outputTokens: number; cost: number; messages: number;
  }>();

  // By project
  const projectMap = new Map<string, {
    projectId: string; name: string; ownerName: string;
    inputTokens: number; outputTokens: number; cost: number; messages: number;
  }>();

  // By agent
  const agentMap = new Map<string, {
    agentId: string; name: string; model: string;
    inputTokens: number; outputTokens: number; cost: number; messages: number;
  }>();

  // Daily usage (last 30 days)
  const dailyMap = new Map<string, { date: string; inputTokens: number; outputTokens: number; cost: number }>();

  for (const msg of messages) {
    const inp = msg.inputTokens || 0;
    const out = msg.outputTokens || 0;
    const model = msg.conversation.agent.model;
    const cost = calculateCost(model, inp, out);

    totalInput += inp;
    totalOutput += out;
    totalCost += cost;

    // By user
    const uid = msg.conversation.project.userId;
    const existing = userMap.get(uid) || {
      userId: uid,
      name: msg.conversation.project.user.name,
      email: msg.conversation.project.user.email,
      tokenLimitMonthly: msg.conversation.project.user.tokenLimitMonthly,
      inputTokens: 0, outputTokens: 0, cost: 0, messages: 0,
    };
    existing.inputTokens += inp;
    existing.outputTokens += out;
    existing.cost += cost;
    existing.messages += 1;
    userMap.set(uid, existing);

    // By project
    const pid = msg.conversation.projectId;
    const existingP = projectMap.get(pid) || {
      projectId: pid,
      name: msg.conversation.project.name,
      ownerName: msg.conversation.project.user.name,
      inputTokens: 0, outputTokens: 0, cost: 0, messages: 0,
    };
    existingP.inputTokens += inp;
    existingP.outputTokens += out;
    existingP.cost += cost;
    existingP.messages += 1;
    projectMap.set(pid, existingP);

    // By agent
    const aid = msg.conversation.agentId;
    const existingA = agentMap.get(aid) || {
      agentId: aid,
      name: msg.conversation.agent.name,
      model,
      inputTokens: 0, outputTokens: 0, cost: 0, messages: 0,
    };
    existingA.inputTokens += inp;
    existingA.outputTokens += out;
    existingA.cost += cost;
    existingA.messages += 1;
    agentMap.set(aid, existingA);

    // Daily (only for 30d and month views)
    if (since) {
      const dateKey = msg.createdAt.toISOString().slice(0, 10);
      const existingD = dailyMap.get(dateKey) || { date: dateKey, inputTokens: 0, outputTokens: 0, cost: 0 };
      existingD.inputTokens += inp;
      existingD.outputTokens += out;
      existingD.cost += cost;
      dailyMap.set(dateKey, existingD);
    }
  }

  // Monthly usage per user (for limit comparison - always current month)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthlyUsageRaw = await prisma.message.groupBy({
    by: ['conversationId'],
    where: { role: 'assistant', createdAt: { gte: startOfMonth } },
    _sum: { tokenCount: true },
  });

  // Get conversations to map to users
  const convIds = monthlyUsageRaw.map((r) => r.conversationId);
  const convUserMap = convIds.length
    ? await prisma.conversation.findMany({
        where: { id: { in: convIds } },
        select: { id: true, project: { select: { userId: true } } },
      })
    : [];

  const monthlyByUser = new Map<string, number>();
  for (const r of monthlyUsageRaw) {
    const conv = convUserMap.find((c) => c.id === r.conversationId);
    if (!conv) continue;
    const uid = conv.project.userId;
    monthlyByUser.set(uid, (monthlyByUser.get(uid) || 0) + (r._sum.tokenCount || 0));
  }

  // Attach monthlyUsed to user rows
  const byUser = Array.from(userMap.values())
    .map((u) => ({ ...u, monthlyTokensUsed: monthlyByUser.get(u.userId) || 0 }))
    .sort((a, b) => b.cost - a.cost);

  const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

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
    daily,
    period,
  });
}
