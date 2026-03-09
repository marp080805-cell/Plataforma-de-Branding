import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Header } from '@/components/layout/header';
import { DashboardClient } from './dashboard-client';
import { prisma } from '@/lib/prisma';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  // Check if API keys are configured
  const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
  const missingApiKey = !settings?.anthropicApiKey && !settings?.openaiApiKey;

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {missingApiKey && session.user.role === 'admin' && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
            <span className="text-amber-500 text-xl">⚠️</span>
            <p className="text-amber-800 text-sm">
              <strong>Atenção:</strong> Configure suas API keys em{' '}
              <a href="/admin/settings" className="underline font-medium hover:text-amber-900">
                Configurações
              </a>{' '}
              para usar os agentes de IA.
            </p>
          </div>
        )}
        <DashboardClient />
      </main>
    </div>
  );
}
