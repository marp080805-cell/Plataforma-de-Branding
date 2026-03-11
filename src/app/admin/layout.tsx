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
    <div className="min-h-screen bg-[#080d0d]">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin nav tabs */}
        <div className="flex gap-0.5 mb-7 bg-[#0d1515] rounded-xl border border-white/[0.07] p-1 w-fit">
          <Link
            href="/admin/agents"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-[#5a8280] hover:bg-white/[0.06] hover:text-[#c0d8d6] transition-all duration-150"
          >
            <Bot className="w-3.5 h-3.5" />
            Agentes
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-[#5a8280] hover:bg-white/[0.06] hover:text-[#c0d8d6] transition-all duration-150"
          >
            <Users className="w-3.5 h-3.5" />
            Usuários
          </Link>
          <Link
            href="/admin/settings"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-[#5a8280] hover:bg-white/[0.06] hover:text-[#c0d8d6] transition-all duration-150"
          >
            <Settings className="w-3.5 h-3.5" />
            Configurações
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
