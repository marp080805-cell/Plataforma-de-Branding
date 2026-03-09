import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { provider } = await req.json();
  const settings = await prisma.settings.findUnique({ where: { id: 'global' } });

  try {
    if (provider === 'anthropic') {
      if (!settings?.anthropicApiKey) throw new Error('API key not configured');
      const apiKey = decrypt(settings.anthropicApiKey);

      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey });
      await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });

      return NextResponse.json({ success: true, message: 'Conexão com Anthropic OK!' });
    } else if (provider === 'openai') {
      if (!settings?.openaiApiKey) throw new Error('API key not configured');
      const apiKey = decrypt(settings.openaiApiKey);

      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({ apiKey });
      await client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });

      return NextResponse.json({ success: true, message: 'Conexão com OpenAI OK!' });
    }

    return NextResponse.json({ error: 'Unknown provider' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Connection failed';
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
