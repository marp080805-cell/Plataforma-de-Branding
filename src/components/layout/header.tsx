'use client';

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { Brain, Settings, Users, Bot, LogOut, ChevronDown, BarChart2, Sun, Moon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { getInitials } from '@/lib/utils';
import { useTheme } from '@/components/providers/theme-provider';

export function Header() {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();

  if (!session) return null;

  const initials = getInitials(session.user.name);
  const isAdmin = session.user.role === 'admin';

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/90 backdrop-blur-xl transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-baseline gap-2.5 group">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_12px_rgba(23,105,104,0.4)] group-hover:shadow-[0_0_20px_rgba(23,105,104,0.5)] transition-all duration-300 self-center">
              <Brain className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-foreground text-base tracking-tight group-hover:text-primary transition-colors">BrandMind</span>
            <span className="inline-flex items-baseline gap-[5px] ml-0.5">
              <span className="text-muted-foreground text-[11px] font-medium italic leading-none">by</span>
              <Image
                src="/seuresultado.png"
                alt="seuresultado"
                width={100}
                height={19}
                className="opacity-40 group-hover:opacity-60 transition-opacity translate-y-[2px] dark:opacity-50 dark:group-hover:opacity-70"
                style={{ filter: 'var(--logo-filter, none)' }}
              />
            </span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-1">
            {isAdmin && (
              <Link
                href="/admin"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium px-3 py-1.5 rounded-lg hover:bg-muted/50"
              >
                Admin
              </Link>
            )}

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
              aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
              title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 outline-none group ml-1">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold ring-2 ring-border/30 group-hover:ring-border/60 transition-all duration-200"
                  style={{ backgroundColor: session.user.avatarColor }}
                >
                  {initials}
                </div>
                <ChevronDown className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="font-medium text-foreground text-sm">{session.user.name}</p>
                  <p className="text-xs text-muted-foreground font-normal mt-0.5">{session.user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/agents" className="cursor-pointer">
                        <Bot className="w-4 h-4 mr-2 opacity-60" />
                        Agentes
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/users" className="cursor-pointer">
                        <Users className="w-4 h-4 mr-2 opacity-60" />
                        Usuários
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/settings" className="cursor-pointer">
                        <Settings className="w-4 h-4 mr-2 opacity-60" />
                        Configurações
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/usage" className="cursor-pointer">
                        <BarChart2 className="w-4 h-4 mr-2 opacity-60" />
                        Uso e Custos
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  className="!text-red-500 cursor-pointer"
                  onClick={() => signOut({ callbackUrl: '/login' })}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
