import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const settings = await prisma.settings.findUnique({ where: { id: 'global' } });

  return NextResponse.json({
    hasAnthropicKey: !!settings?.anthropicApiKey,
    hasOpenAIKey: !!settings?.openaiApiKey,
    // Never return actual keys
  });
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { anthropicApiKey, openaiApiKey } = await req.json();

  const updateData: Record<string, string | null> = {};

  if (anthropicApiKey !== undefined) {
    updateData.anthropicApiKey = anthropicApiKey ? encrypt(anthropicApiKey) : null;
  }
  if (openaiApiKey !== undefined) {
    updateData.openaiApiKey = openaiApiKey ? encrypt(openaiApiKey) : null;
  }

  await prisma.settings.upsert({
    where: { id: 'global' },
    update: updateData,
    create: { id: 'global', ...updateData },
  });

  return NextResponse.json({ success: true });
}
