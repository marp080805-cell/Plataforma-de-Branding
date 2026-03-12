'use client';

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { Zap, Settings, Users, Bot, LogOut, ChevronDown, BarChart2 } from 'lucide-react';
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
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#090e0e]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-baseline gap-2.5 group">
            <div className="w-7 h-7 bg-[#176968] rounded-lg flex items-center justify-center shadow-[0_0_12px_rgba(23,105,104,0.4)] group-hover:shadow-[0_0_20px_rgba(23,105,104,0.5)] transition-all duration-300 self-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-[#e0f0ef] text-base tracking-tight group-hover:text-white transition-colors">BrandMind</span>
            <span className="inline-flex items-baseline gap-[5px] ml-0.5">
              <span className="text-[#6a9290] text-[11px] font-medium italic leading-none">by</span>
              <Image src="/seuresultado.png" alt="seuresultado" width={100} height={19} className="opacity-50 group-hover:opacity-70 transition-opacity translate-y-[2px]" style={{ filter: 'brightness(1.5)' }} />
            </span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                href="/admin"
                className="text-xs text-[#5a8280] hover:text-[#90b0ae] transition-colors font-medium px-3 py-1.5 rounded-lg hover:bg-white/[0.05]"
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
                <ChevronDown className="w-3 h-3 text-[#3a5e5c] group-hover:text-[#7a9e9c] transition-colors" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="font-medium text-[#e0f0ef] text-sm">{session.user.name}</p>
                  <p className="text-xs text-[#5a7a78] font-normal mt-0.5">{session.user.email}</p>
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
