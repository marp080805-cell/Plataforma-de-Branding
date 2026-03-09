import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Header } from '@/components/layout/header';
import Link from 'next/link';
import { Bot, Users, Settings } from 'lucide-react';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (session.user.role !== 'admin') redirect('/dashboard');

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin nav tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl border border-zinc-200 p-1 w-fit">
          <Link
            href="/admin/agents"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-all"
          >
            <Bot className="w-4 h-4" />
            Agentes
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-all"
          >
            <Users className="w-4 h-4" />
            Usuários
          </Link>
          <Link
            href="/admin/settings"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-all"
          >
            <Settings className="w-4 h-4" />
            Configurações
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
