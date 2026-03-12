import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Header } from '@/components/layout/header';
import Link from 'next/link';
import { Bot, Users, Settings, BarChart2 } from 'lucide-react';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (session.user.role !== 'admin') redirect('/dashboard');

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin nav tabs */}
        <div className="flex gap-0.5 mb-7 bg-card rounded-xl border border-border/60 p-1 w-fit">
          <Link
            href="/admin/agents"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-150"
          >
            <Bot className="w-3.5 h-3.5" />
            Agentes
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-150"
          >
            <Users className="w-3.5 h-3.5" />
            Usuários
          </Link>
          <Link
            href="/admin/usage"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-150"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Uso &amp; Custos
          </Link>
          <Link
            href="/admin/settings"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-150"
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
