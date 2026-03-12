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
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {missingApiKey && session.user.role === 'admin' && (
          <div className="mb-6 p-4 bg-[#f59e0b]/[0.08] border border-[#f59e0b]/[0.2] rounded-xl flex items-center gap-3">
            <span className="text-[#f59e0b] text-sm">⚠</span>
            <p className="text-[#c09040] text-sm">
              <span className="font-medium text-[#e0b060]">Atenção:</span> Configure suas API keys em{' '}
              <a href="/admin/settings" className="underline font-medium text-[#f59e0b] hover:text-[#fbbf24] transition-colors">
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
