'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Users, FolderOpen, Bot, DollarSign, Brain, ArrowUpDown, ChevronRight, ChevronDown, Calendar, FileSearch, Cpu } from 'lucide-react';
import { formatTokens, formatCost } from '@/lib/pricing';

type Period = 'month' | '30d' | '7d' | 'all' | 'custom';

interface Summary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  totalMessages: number;
  ocrInputTokens: number;
  ocrOutputTokens: number;
  ocrCost: number;
  ocrFiles: number;
}

interface UserRow {
  userId: string;
  name: string;
  email: string;
  dailySpendLimit: number | null;
  dailySpend: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  messages: number;
}

interface ProjectRow {
  projectId: string;
  name: string;
  ownerName?: string;
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

interface ModelRow {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  requests: number;
}

interface OcrModelRow {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  files: number;
}

interface UsageData {
  summary: Summary;
  byUser: UserRow[];
  byProject: ProjectRow[];
  byAgent: AgentRow[];
  byModel: ModelRow[];
  byOcrModel: OcrModelRow[];
  userProjects: Record<string, ProjectRow[]>;
  projectAgents: Record<string, AgentRow[]>;
  period: string;
  pricingLastFetch: string | null;
}

const PERIOD_LABELS: Record<Period, string> = {
  month: 'Este mês',
  '30d': 'Últimos 30 dias',
  '7d': 'Últimos 7 dias',
  all: 'Todo o período',
  custom: 'Personalizado',
};

function LimitBar({ used, limit }: { used: number; limit: number | null }) {
  if (!limit) return <span className="text-muted-foreground/60 text-xs">Sem limite</span>;
  const pct = Math.min((used / limit) * 100, 100);
  const color = pct >= 90 ? 'bg-destructive' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-muted-foreground text-xs whitespace-nowrap">
        ${used.toFixed(3)} / ${limit.toFixed(2)}/dia
      </span>
    </div>
  );
}

function TotalRow({ cols, s }: { cols: number; s: Summary | undefined }) {
  return (
    <tr className="border-t border-border/60 bg-muted/30">
      <td className="px-5 py-3 text-muted-foreground font-semibold text-xs">TOTAL</td>
      {cols === 7 && <td className="px-4 py-3" />}
      <td className="px-4 py-3 text-right text-foreground font-semibold text-xs">{formatTokens(s?.totalInputTokens || 0)}</td>
      <td className="px-4 py-3 text-right text-foreground font-semibold text-xs">{formatTokens(s?.totalOutputTokens || 0)}</td>
      <td className="px-4 py-3 text-right text-foreground font-semibold text-xs">{formatTokens(s?.totalTokens || 0)}</td>
      <td className="px-4 py-3 text-right text-emerald-500 font-semibold text-xs">${(s?.totalCost || 0).toFixed(4)}</td>
      <td className="px-4 py-3 text-right text-foreground font-semibold text-xs">{s?.totalMessages || 0}</td>
      {cols === 7 && <td className="px-4 py-3" />}
    </tr>
  );
}

export default function UsagePage() {
  const [period, setPeriod] = useState<Period>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'users' | 'projects' | 'agents' | 'models' | 'ocr'>('users');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    if (period === 'custom' && !startDate && !endDate) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (period === 'custom') {
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
      }
      const res = await fetch(`/api/admin/usage?${params}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [period, startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleUser = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const s = data?.summary;
  const hasData = (data?.byUser || []).length > 0;
  const chatCost = (s?.totalCost || 0) - (s?.ocrCost || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Consumo de Tokens</h1>
          <p className="text-muted-foreground text-sm mt-1">Acompanhe o uso e custos da plataforma</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-2 items-end">
          <div className="flex flex-wrap gap-1 bg-card rounded-xl border border-border/60 p-1">
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  period === p
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {p === 'custom' && <Calendar className="w-3 h-3" />}
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-3 bg-card rounded-xl border border-border/60 px-4 py-2.5">
              <span className="text-xs text-muted-foreground">De</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs text-foreground outline-none border border-border/60 rounded-lg px-2 py-1"
              />
              <span className="text-xs text-muted-foreground">até</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs text-foreground outline-none border border-border/60 rounded-lg px-2 py-1"
              />
            </div>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            icon: Brain,
            label: 'Total de Tokens',
            value: loading ? '—' : formatTokens(s?.totalTokens || 0),
            sub: loading ? '' : `↑ ${formatTokens(s?.totalInputTokens || 0)} entrada / ${formatTokens(s?.totalOutputTokens || 0)} saída`,
            colorClass: 'bg-primary/10 text-primary border-primary/20',
          },
          {
            icon: DollarSign,
            label: 'Custo Total',
            value: loading ? '—' : `$${(s?.totalCost || 0).toFixed(4)}`,
            sub: loading ? 'USD' : `Chat $${chatCost.toFixed(4)} · OCR $${(s?.ocrCost || 0).toFixed(4)}`,
            colorClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
          },
          {
            icon: ArrowUpDown,
            label: 'Respostas',
            value: loading ? '—' : String(s?.totalMessages || 0),
            sub: loading ? '' : `+ ${s?.ocrFiles || 0} arquivos OCR`,
            colorClass: 'bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400',
          },
          {
            icon: TrendingUp,
            label: 'Custo Médio',
            value: loading ? '—' : s?.totalMessages
              ? formatCost(chatCost / s.totalMessages)
              : '$0',
            sub: 'por resposta de chat',
            colorClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
          },
        ].map((card) => (
          <div key={card.label} className="bg-card rounded-2xl border border-border/60 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${card.colorClass}`}>
                <card.icon className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs text-muted-foreground">{card.label}</span>
            </div>
            <div className="text-xl font-semibold text-foreground">{card.value}</div>
            <div className="text-xs text-muted-foreground/70 mt-1">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* OCR banner (shown only when there's OCR cost) */}
      {!loading && (s?.ocrCost || 0) > 0 && (
        <div className="flex items-center gap-3 bg-card border border-border/60 rounded-xl px-5 py-3.5">
          <FileSearch className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="flex-1 text-xs text-muted-foreground">
            <span className="text-foreground font-medium">OCR de documentos</span>
            {' '}— {s?.ocrFiles} arquivo{(s?.ocrFiles || 0) !== 1 ? 's' : ''} processado{(s?.ocrFiles || 0) !== 1 ? 's' : ''} com IA (PDF e imagens).
            {' '}Tokens: <span className="text-foreground">{formatTokens((s?.ocrInputTokens || 0) + (s?.ocrOutputTokens || 0))}</span>
            {' '}· Custo: <span className="text-emerald-500">${(s?.ocrCost || 0).toFixed(4)}</span>
          </div>
          <button
            onClick={() => setTab('ocr')}
            className="text-xs text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
          >
            Ver detalhes →
          </button>
        </div>
      )}

      {/* Breakdown tabs */}
      <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-sm">
        <div className="flex border-b border-border/60 overflow-x-auto">
          {([
            { key: 'users', icon: Users, label: 'Por Especialista' },
            { key: 'projects', icon: FolderOpen, label: 'Por Projeto' },
            { key: 'agents', icon: Bot, label: 'Por Agente' },
            { key: 'models', icon: Cpu, label: 'Por Modelo' },
            { key: 'ocr', icon: FileSearch, label: 'OCR Docs' },
          ] as const).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-xs font-medium transition-all border-b-2 whitespace-nowrap ${
                tab === key
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
          <div className="ml-auto flex items-center px-4 flex-shrink-0">
            {tab === 'users' && hasData && (
              <span className="text-[10px] text-muted-foreground/50">Clique no especialista para expandir projetos e agentes</span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-muted-foreground text-sm">Carregando...</div>
        ) : period === 'custom' && !startDate && !endDate ? (
          <div className="p-10 text-center text-muted-foreground text-sm">Selecione um período de datas para ver os dados</div>
        ) : (
          <div className="overflow-x-auto">

            {/* ── POR ESPECIALISTA (hierarchical) ── */}
            {tab === 'users' && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-5 py-3">Especialista / Projeto / Agente</th>
                    <th className="text-right text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-4 py-3">Tokens Entrada</th>
                    <th className="text-right text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-4 py-3">Tokens Saída</th>
                    <th className="text-right text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-4 py-3">Total</th>
                    <th className="text-right text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-4 py-3">Custo</th>
                    <th className="text-right text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-4 py-3">Respostas</th>
                    <th className="text-left text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-4 py-3">Limite Diário</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.byUser || []).length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">Nenhum dado no período</td></tr>
                  ) : (data?.byUser || []).map((u) => (
                    <React.Fragment key={u.userId}>
                      {/* User row */}
                      <tr
                        className="border-b border-border/40 hover:bg-muted/20 cursor-pointer transition-colors"
                        onClick={() => toggleUser(u.userId)}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground/60">
                              {expandedUsers.has(u.userId)
                                ? <ChevronDown className="w-3.5 h-3.5" />
                                : <ChevronRight className="w-3.5 h-3.5" />}
                            </span>
                            <div>
                              <div className="text-foreground font-medium">{u.name}</div>
                              <div className="text-muted-foreground/70">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{formatTokens(u.inputTokens)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{formatTokens(u.outputTokens)}</td>
                        <td className="px-4 py-3 text-right text-foreground font-medium">{formatTokens(u.inputTokens + u.outputTokens)}</td>
                        <td className="px-4 py-3 text-right text-emerald-500 font-medium">${u.cost.toFixed(4)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{u.messages}</td>
                        <td className="px-4 py-3">
                          <LimitBar used={u.dailySpend} limit={u.dailySpendLimit} />
                        </td>
                      </tr>

                      {/* Project rows */}
                      {expandedUsers.has(u.userId) && (data?.userProjects?.[u.userId] || []).map((proj) => (
                        <React.Fragment key={`${u.userId}-${proj.projectId}`}>
                          <tr
                            className="border-b border-border/30 hover:bg-muted/10 cursor-pointer transition-colors bg-muted/20"
                            onClick={(e) => toggleProject(proj.projectId, e)}
                          >
                            <td className="px-5 py-2.5 pl-11">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground/50">
                                  {expandedProjects.has(proj.projectId)
                                    ? <ChevronDown className="w-3 h-3" />
                                    : <ChevronRight className="w-3 h-3" />}
                                </span>
                                <FolderOpen className="w-3 h-3 text-primary/60 flex-shrink-0" />
                                <span className="text-foreground/80">{proj.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground/70">{formatTokens(proj.inputTokens)}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground/70">{formatTokens(proj.outputTokens)}</td>
                            <td className="px-4 py-2.5 text-right text-foreground/80">{formatTokens(proj.inputTokens + proj.outputTokens)}</td>
                            <td className="px-4 py-2.5 text-right text-emerald-500/80">${proj.cost.toFixed(4)}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground/70">{proj.messages}</td>
                            <td className="px-4 py-2.5" />
                          </tr>

                          {/* Agent rows */}
                          {expandedProjects.has(proj.projectId) && (data?.projectAgents?.[proj.projectId] || []).map((agent) => (
                            <tr
                              key={`${proj.projectId}-${agent.agentId}`}
                              className="border-b border-border/20 bg-muted/30"
                            >
                              <td className="px-5 py-2 pl-20">
                                <div className="flex items-center gap-2">
                                  <Bot className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                                  <span className="text-muted-foreground">{agent.name}</span>
                                  <span className="font-mono text-muted-foreground/60 bg-muted/50 px-1.5 py-0.5 rounded text-[10px]">{agent.model}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2 text-right text-muted-foreground/60">{formatTokens(agent.inputTokens)}</td>
                              <td className="px-4 py-2 text-right text-muted-foreground/60">{formatTokens(agent.outputTokens)}</td>
                              <td className="px-4 py-2 text-right text-muted-foreground">{formatTokens(agent.inputTokens + agent.outputTokens)}</td>
                              <td className="px-4 py-2 text-right text-emerald-500/70">${agent.cost.toFixed(4)}</td>
                              <td className="px-4 py-2 text-right text-muted-foreground/60">{agent.messages}</td>
                              <td className="px-4 py-2" />
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  ))}

                  {/* Total row */}
                  {hasData && <TotalRow cols={7} s={s} />}
                </tbody>
              </table>
            )}

            {/* ── POR PROJETO ── */}
            {tab === 'projects' && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-5 py-3">Projeto</th>
                    <th className="text-left text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-4 py-3">Proprietário</th>
                    <th className="text-right text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-4 py-3">Tokens Entrada</th>
                    <th className="text-right text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-4 py-3">Tokens Saída</th>
                    <th className="text-right text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-4 py-3">Total</th>
                    <th className="text-right text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-4 py-3">Custo</th>
                    <th className="text-right text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-4 py-3">Respostas</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.byProject || []).length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">Nenhum dado no período</td></tr>
                  ) : (data?.byProject || []).map((p) => (
                    <tr key={p.projectId} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3 text-foreground font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.ownerName}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{formatTokens(p.inputTokens)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{formatTokens(p.outputTokens)}</td>
                      <td className="px-4 py-3 text-right text-foreground font-medium">{formatTokens(p.inputTokens + p.outputTokens)}</td>
                      <td className="px-4 py-3 text-right text-emerald-500">${p.cost.toFixed(4)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{p.messages}</td>
                    </tr>
                  ))}
                  {(data?.byProject || []).length > 0 && <TotalRow cols={6} s={s} />}
                </tbody>
              </table>
            )}

            {/* ── POR AGENTE ── */}
            {tab === 'agents' && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-5 py-3">Agente</th>
                    <th className="text-left text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-4 py-3">Modelo</th>
                    <th className="text-right text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-4 py-3">Tokens Entrada</th>
                    <th className="text-right text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-4 py-3">Tokens Saída</th>
                    <th className="text-right text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-4 py-3">Total</th>
                    <th className="text-right text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-4 py-3">Custo</th>
                    <th className="text-right text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-4 py-3">Respostas</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.byAgent || []).length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">Nenhum dado no período</td></tr>
                  ) : (data?.byAgent || []).map((a) => (
                    <tr key={a.agentId} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3 text-foreground font-medium">{a.name}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">{a.model}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{formatTokens(a.inputTokens)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{formatTokens(a.outputTokens)}</td>
                      <td className="px-4 py-3 text-right text-foreground font-medium">{formatTokens(a.inputTokens + a.outputTokens)}</td>
                      <td className="px-4 py-3 text-right text-emerald-500">${a.cost.toFixed(4)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{a.messages}</td>
                    </tr>
                  ))}
                  {(data?.byAgent || []).length > 0 && <TotalRow cols={6} s={s} />}
                </tbody>
              </table>
            )}

            {/* ── POR MODELO ── */}
            {tab === 'models' && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-5 py-3">Modelo</th>
                    <th className="text-right text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-4 py-3">Tokens Entrada</th>
                    <th className="text-right text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-4 py-3">Tokens Saída</th>
                    <th className="text-right text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-4 py-3">Total Tokens</th>
                    <th className="text-right text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-4 py-3">Custo Total</th>
                    <th className="text-right text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-4 py-3">% do Custo</th>
                    <th className="text-right text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-4 py-3">Requests</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.byModel || []).length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">Nenhum dado no período</td></tr>
                  ) : (data?.byModel || []).map((m) => {
                    const pct = s?.totalCost ? (m.cost / s.totalCost) * 100 : 0;
                    return (
                      <tr key={m.model} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3">
                          <span className="font-mono text-foreground bg-muted/50 px-2 py-0.5 rounded">{m.model}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{formatTokens(m.inputTokens)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{formatTokens(m.outputTokens)}</td>
                        <td className="px-4 py-3 text-right text-foreground font-medium">{formatTokens(m.inputTokens + m.outputTokens)}</td>
                        <td className="px-4 py-3 text-right text-emerald-500 font-medium">${m.cost.toFixed(4)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-muted-foreground w-10 text-right">{pct.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{m.requests}</td>
                      </tr>
                    );
                  })}
                  {(data?.byModel || []).length > 0 && (
                    <tr className="border-t border-border/60 bg-muted/30">
                      <td className="px-5 py-3 text-muted-foreground font-semibold text-xs">TOTAL</td>
                      <td className="px-4 py-3 text-right text-foreground font-semibold text-xs">{formatTokens(s?.totalInputTokens || 0)}</td>
                      <td className="px-4 py-3 text-right text-foreground font-semibold text-xs">{formatTokens(s?.totalOutputTokens || 0)}</td>
                      <td className="px-4 py-3 text-right text-foreground font-semibold text-xs">{formatTokens(s?.totalTokens || 0)}</td>
                      <td className="px-4 py-3 text-right text-emerald-500 font-semibold text-xs">${(s?.totalCost || 0).toFixed(4)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs">100%</td>
                      <td className="px-4 py-3" />
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {/* ── OCR DE DOCUMENTOS ── */}
            {tab === 'ocr' && (
              <div>
                {(data?.byOcrModel || []).length === 0 ? (
                  <div className="px-5 py-10 text-center text-muted-foreground text-sm">
                    <FileSearch className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    Nenhum arquivo OCR processado no período
                  </div>
                ) : (
                  <>
                    <div className="px-5 py-4 border-b border-border/60 flex items-center gap-2">
                      <FileSearch className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs text-muted-foreground">
                        Tokens consumidos ao processar PDFs e imagens com IA para extração de texto.
                        {' '}PDFs usam <span className="font-mono text-foreground/80">claude-haiku-4-5</span>,
                        {' '}imagens usam <span className="font-mono text-foreground/80">gpt-4o-mini</span>.
                      </span>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/60 bg-muted/30">
                          <th className="text-left text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-5 py-3">Modelo OCR</th>
                          <th className="text-right text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-4 py-3">Tokens Entrada</th>
                          <th className="text-right text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-4 py-3">Tokens Saída</th>
                          <th className="text-right text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-4 py-3">Total Tokens</th>
                          <th className="text-right text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-4 py-3">Custo</th>
                          <th className="text-right text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-4 py-3">Arquivos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data?.byOcrModel || []).map((m) => (
                          <tr key={m.model} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                            <td className="px-5 py-3">
                              <span className="font-mono text-foreground bg-muted/50 px-2 py-0.5 rounded">{m.model}</span>
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">{formatTokens(m.inputTokens)}</td>
                            <td className="px-4 py-3 text-right text-muted-foreground">{formatTokens(m.outputTokens)}</td>
                            <td className="px-4 py-3 text-right text-foreground font-medium">{formatTokens(m.inputTokens + m.outputTokens)}</td>
                            <td className="px-4 py-3 text-right text-emerald-500 font-medium">${m.cost.toFixed(4)}</td>
                            <td className="px-4 py-3 text-right text-muted-foreground">{m.files}</td>
                          </tr>
                        ))}
                        <tr className="border-t border-border/60 bg-muted/30">
                          <td className="px-5 py-3 text-muted-foreground font-semibold text-xs">TOTAL OCR</td>
                          <td className="px-4 py-3 text-right text-foreground font-semibold text-xs">{formatTokens(s?.ocrInputTokens || 0)}</td>
                          <td className="px-4 py-3 text-right text-foreground font-semibold text-xs">{formatTokens(s?.ocrOutputTokens || 0)}</td>
                          <td className="px-4 py-3 text-right text-foreground font-semibold text-xs">{formatTokens((s?.ocrInputTokens || 0) + (s?.ocrOutputTokens || 0))}</td>
                          <td className="px-4 py-3 text-right text-emerald-500 font-semibold text-xs">${(s?.ocrCost || 0).toFixed(4)}</td>
                          <td className="px-4 py-3 text-right text-foreground font-semibold text-xs">{s?.ocrFiles || 0}</td>
                        </tr>
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            )}

          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground/50 text-center">
        Custos calculados com base nos preços LiteLLM (atualização automática a cada 24h).
        {data?.pricingLastFetch
          ? <> Última sincronização: <span className="text-muted-foreground">{new Date(data.pricingLastFetch).toLocaleString('pt-BR')}</span>.</>
          : <> Preços carregados da tabela local (sincronização pendente).</>
        }
      </p>
    </div>
  );
}
