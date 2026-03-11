'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Users, FolderOpen, Bot, DollarSign, Zap, ArrowUpDown } from 'lucide-react';
import { formatTokens, formatCost } from '@/lib/pricing';

type Period = 'month' | '30d' | '7d' | 'all';

interface Summary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  totalMessages: number;
}

interface UserRow {
  userId: string;
  name: string;
  email: string;
  tokenLimitMonthly: number | null;
  monthlyTokensUsed: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  messages: number;
}

interface ProjectRow {
  projectId: string;
  name: string;
  ownerName: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  messages: number;
}

interface AgentRow {
  agentId: string;
  name: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  messages: number;
}

interface UsageData {
  summary: Summary;
  byUser: UserRow[];
  byProject: ProjectRow[];
  byAgent: AgentRow[];
  period: string;
}

const PERIOD_LABELS: Record<Period, string> = {
  month: 'Este mês',
  '30d': 'Últimos 30 dias',
  '7d': 'Últimos 7 dias',
  all: 'Todo o período',
};

function LimitBar({ used, limit }: { used: number; limit: number | null }) {
  if (!limit) return <span className="text-[#4a7070] text-xs">Sem limite</span>;
  const pct = Math.min((used / limit) * 100, 100);
  const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#34d399';
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[#7a9e9c] text-xs whitespace-nowrap">
        {formatTokens(used)} / {formatTokens(limit)}
      </span>
    </div>
  );
}

export default function UsagePage() {
  const [period, setPeriod] = useState<Period>('month');
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'users' | 'projects' | 'agents'>('users');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/usage?period=${period}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const s = data?.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[#c0d8d6]">Consumo de Tokens</h1>
          <p className="text-xs text-[#4a7070] mt-0.5">Acompanhe o uso e custos da plataforma</p>
        </div>
        <div className="flex gap-1 bg-[#0d1515] rounded-xl border border-white/[0.07] p-1">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                period === p
                  ? 'bg-[#176968]/30 text-[#76c0bc] border border-[#176968]/40'
                  : 'text-[#5a8280] hover:text-[#c0d8d6]'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            icon: Zap,
            label: 'Total de Tokens',
            value: loading ? '—' : formatTokens(s?.totalTokens || 0),
            sub: loading ? '' : `↑ ${formatTokens(s?.totalInputTokens || 0)} entrada / ${formatTokens(s?.totalOutputTokens || 0)} saída`,
            color: '#176968',
          },
          {
            icon: DollarSign,
            label: 'Custo Estimado',
            value: loading ? '—' : `$${(s?.totalCost || 0).toFixed(4)}`,
            sub: 'USD',
            color: '#16a34a',
          },
          {
            icon: ArrowUpDown,
            label: 'Respostas',
            value: loading ? '—' : String(s?.totalMessages || 0),
            sub: 'mensagens do assistente',
            color: '#7c3aed',
          },
          {
            icon: TrendingUp,
            label: 'Custo Médio',
            value: loading ? '—' : s?.totalMessages
              ? formatCost((s.totalCost) / s.totalMessages)
              : '$0',
            sub: 'por resposta',
            color: '#b45309',
          },
        ].map((card) => (
          <div key={card.label} className="bg-[#0d1515] rounded-2xl border border-white/[0.07] p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${card.color}22` }}>
                <card.icon className="w-3.5 h-3.5" style={{ color: card.color }} />
              </div>
              <span className="text-xs text-[#4a7070]">{card.label}</span>
            </div>
            <div className="text-xl font-semibold text-[#c8e8e6]">{card.value}</div>
            <div className="text-xs text-[#4a7070] mt-1">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Breakdown tabs */}
      <div className="bg-[#0d1515] rounded-2xl border border-white/[0.07] overflow-hidden">
        <div className="flex border-b border-white/[0.07]">
          {([
            { key: 'users', icon: Users, label: 'Por Especialista' },
            { key: 'projects', icon: FolderOpen, label: 'Por Projeto' },
            { key: 'agents', icon: Bot, label: 'Por Agente' },
          ] as const).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-xs font-medium transition-all border-b-2 ${
                tab === key
                  ? 'border-[#176968] text-[#76c0bc] bg-[#176968]/[0.06]'
                  : 'border-transparent text-[#5a8280] hover:text-[#c0d8d6]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-10 text-center text-[#4a7070] text-sm">Carregando...</div>
        ) : (
          <div className="overflow-x-auto">
            {tab === 'users' && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    <th className="text-left text-[#4a7070] font-medium px-5 py-3">Especialista</th>
                    <th className="text-right text-[#4a7070] font-medium px-4 py-3">Tokens Entrada</th>
                    <th className="text-right text-[#4a7070] font-medium px-4 py-3">Tokens Saída</th>
                    <th className="text-right text-[#4a7070] font-medium px-4 py-3">Total</th>
                    <th className="text-right text-[#4a7070] font-medium px-4 py-3">Custo</th>
                    <th className="text-right text-[#4a7070] font-medium px-4 py-3">Respostas</th>
                    <th className="text-left text-[#4a7070] font-medium px-4 py-3">Limite Mensal</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.byUser || []).length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-[#4a7070]">Nenhum dado no período</td></tr>
                  ) : (data?.byUser || []).map((u) => (
                    <tr key={u.userId} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-5 py-3">
                        <div className="text-[#c0d8d6] font-medium">{u.name}</div>
                        <div className="text-[#4a7070]">{u.email}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-[#7a9e9c]">{formatTokens(u.inputTokens)}</td>
                      <td className="px-4 py-3 text-right text-[#7a9e9c]">{formatTokens(u.outputTokens)}</td>
                      <td className="px-4 py-3 text-right text-[#c0d8d6] font-medium">{formatTokens(u.inputTokens + u.outputTokens)}</td>
                      <td className="px-4 py-3 text-right text-[#34d399]">${u.cost.toFixed(4)}</td>
                      <td className="px-4 py-3 text-right text-[#7a9e9c]">{u.messages}</td>
                      <td className="px-4 py-3">
                        <LimitBar used={u.monthlyTokensUsed} limit={u.tokenLimitMonthly} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'projects' && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    <th className="text-left text-[#4a7070] font-medium px-5 py-3">Projeto</th>
                    <th className="text-left text-[#4a7070] font-medium px-4 py-3">Proprietário</th>
                    <th className="text-right text-[#4a7070] font-medium px-4 py-3">Tokens Entrada</th>
                    <th className="text-right text-[#4a7070] font-medium px-4 py-3">Tokens Saída</th>
                    <th className="text-right text-[#4a7070] font-medium px-4 py-3">Total</th>
                    <th className="text-right text-[#4a7070] font-medium px-4 py-3">Custo</th>
                    <th className="text-right text-[#4a7070] font-medium px-4 py-3">Respostas</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.byProject || []).length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-[#4a7070]">Nenhum dado no período</td></tr>
                  ) : (data?.byProject || []).map((p) => (
                    <tr key={p.projectId} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-5 py-3 text-[#c0d8d6] font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-[#7a9e9c]">{p.ownerName}</td>
                      <td className="px-4 py-3 text-right text-[#7a9e9c]">{formatTokens(p.inputTokens)}</td>
                      <td className="px-4 py-3 text-right text-[#7a9e9c]">{formatTokens(p.outputTokens)}</td>
                      <td className="px-4 py-3 text-right text-[#c0d8d6] font-medium">{formatTokens(p.inputTokens + p.outputTokens)}</td>
                      <td className="px-4 py-3 text-right text-[#34d399]">${p.cost.toFixed(4)}</td>
                      <td className="px-4 py-3 text-right text-[#7a9e9c]">{p.messages}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'agents' && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    <th className="text-left text-[#4a7070] font-medium px-5 py-3">Agente</th>
                    <th className="text-left text-[#4a7070] font-medium px-4 py-3">Modelo</th>
                    <th className="text-right text-[#4a7070] font-medium px-4 py-3">Tokens Entrada</th>
                    <th className="text-right text-[#4a7070] font-medium px-4 py-3">Tokens Saída</th>
                    <th className="text-right text-[#4a7070] font-medium px-4 py-3">Total</th>
                    <th className="text-right text-[#4a7070] font-medium px-4 py-3">Custo</th>
                    <th className="text-right text-[#4a7070] font-medium px-4 py-3">Respostas</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.byAgent || []).length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-[#4a7070]">Nenhum dado no período</td></tr>
                  ) : (data?.byAgent || []).map((a) => (
                    <tr key={a.agentId} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-5 py-3 text-[#c0d8d6] font-medium">{a.name}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[#5a8280] bg-white/[0.04] px-2 py-0.5 rounded">{a.model}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-[#7a9e9c]">{formatTokens(a.inputTokens)}</td>
                      <td className="px-4 py-3 text-right text-[#7a9e9c]">{formatTokens(a.outputTokens)}</td>
                      <td className="px-4 py-3 text-right text-[#c0d8d6] font-medium">{formatTokens(a.inputTokens + a.outputTokens)}</td>
                      <td className="px-4 py-3 text-right text-[#34d399]">${a.cost.toFixed(4)}</td>
                      <td className="px-4 py-3 text-right text-[#7a9e9c]">{a.messages}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-[#3a5a58] text-center">
        Custos calculados com base nos preços publicados dos provedores. Valores aproximados.
      </p>
    </div>
  );
}
