'use client';

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { Zap, Settings, Users, Bot, LogOut, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { getInitials } from '@/lib/utils';

export function Header() {
  const { data: session } = useSession();

  if (!session) return null;

  const initials = getInitials(session.user.name);
  const isAdmin = session.user.role === 'admin';

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0a0a10]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 bg-[#7c6ef5] rounded-lg flex items-center justify-center shadow-[0_0_12px_rgba(124,110,245,0.4)] group-hover:shadow-[0_0_20px_rgba(124,110,245,0.5)] transition-all duration-300">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-[#e0e0f0] text-base tracking-tight group-hover:text-white transition-colors">BrandMind</span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                href="/admin"
                className="text-xs text-[#606080] hover:text-[#a0a0c0] transition-colors font-medium px-3 py-1.5 rounded-lg hover:bg-white/[0.05]"
              >
                Admin
              </Link>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 outline-none group">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold ring-2 ring-white/[0.08] group-hover:ring-white/[0.15] transition-all duration-200"
                  style={{ backgroundColor: session.user.avatarColor }}
                >
                  {initials}
                </div>
                <ChevronDown className="w-3 h-3 text-[#404060] group-hover:text-[#8080a0] transition-colors" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="font-medium text-[#e0e0f0] text-sm">{session.user.name}</p>
                  <p className="text-xs text-[#60607a] font-normal mt-0.5">{session.user.email}</p>
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
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  className="!text-[#ff7070] cursor-pointer hover:!bg-[#c93030]/[0.12]"
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
