'use client';

import { useState, useEffect } from 'react';
import { Plus, Loader2, Trash2, ChevronUp, ChevronDown, Brain, BookOpen, Search, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  systemPrompt: string;
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  isActive: boolean;
  sortOrder: number;
  tutorialUrl: string | null;
}

const ICONS = ['brain', 'book-open', 'search', 'bot'];
const ICON_COMPONENTS: Record<string, React.ElementType> = {
  'brain': Brain, 'book-open': BookOpen, 'search': Search, 'bot': Bot,
};

const MODELS: Record<string, { id: string; label: string }[]> = {
  anthropic: [
    { id: 'claude-opus-4-6', label: 'Claude Opus 4.6 (mais poderoso)' },
    { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (recomendado)' },
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (mais rápido)' },
    { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { id: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
  ],
  openai: [
    { id: 'gpt-5.4', label: 'GPT-5.4 (mais poderoso)' },
    { id: 'gpt-5', label: 'GPT-5' },
    { id: 'gpt-5-mini', label: 'GPT-5 Mini' },
    { id: 'gpt-4.1', label: 'GPT-4.1' },
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  ],
};

const defaultAgent: Omit<Agent, 'id' | 'sortOrder'> = {
  name: '', description: '', icon: 'brain', systemPrompt: '',
  provider: 'anthropic', model: 'claude-sonnet-4-6',
  temperature: 0.7, maxTokens: 4096, isActive: true, tutorialUrl: null,
};

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [form, setForm] = useState(defaultAgent);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState<Agent | null>(null);

  useEffect(() => { fetchAgents(); }, []);

  const fetchAgents = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/agents');
    setAgents(await res.json());
    setLoading(false);
  };

  const openCreate = () => { setEditing(null); setForm(defaultAgent); setShowForm(true); };
  const openEdit = (agent: Agent) => {
    setEditing(agent);
    setForm({ name: agent.name, description: agent.description, icon: agent.icon,
      systemPrompt: agent.systemPrompt, provider: agent.provider, model: agent.model,
      temperature: agent.temperature, maxTokens: agent.maxTokens, isActive: agent.isActive,
      tutorialUrl: agent.tutorialUrl });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.systemPrompt.trim()) return;
    setSaving(true);
    if (editing) {
      await fetch(`/api/admin/agents/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    } else {
      await fetch('/api/admin/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    }
    setSaving(false); setShowForm(false); fetchAgents();
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    await fetch(`/api/admin/agents/${showDelete.id}`, { method: 'DELETE' });
    setShowDelete(null); fetchAgents();
  };

  const moveAgent = async (id: string, direction: 'up' | 'down') => {
    const index = agents.findIndex((a) => a.id === id);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === agents.length - 1)) return;
    const newAgents = [...agents];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    [newAgents[index], newAgents[swapIdx]] = [newAgents[swapIdx], newAgents[index]];
    setAgents(newAgents);
    await fetch('/api/admin/agents/reorder', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderedIds: newAgents.map((a) => a.id) }) });
  };

  const handleProviderChange = (provider: string) => setForm({ ...form, provider, model: MODELS[provider][0].id });
  const IconComp = ICON_COMPONENTS[form.icon] || Bot;

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Agentes</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure os agentes de IA da plataforma</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1.5" />
          Novo Agente
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border/60">
          <Bot className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm font-medium">Nenhum agente criado ainda.</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Clique em "Novo Agente" para começar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {agents.map((agent, idx) => {
            const Icon = ICON_COMPONENTS[agent.icon] || Bot;
            return (
              <div
                key={agent.id}
                className="bg-card rounded-xl border border-border/60 p-4 flex items-center gap-4 hover:border-primary/30 hover:shadow-sm transition-all duration-200 group"
              >
                {/* Sort controls */}
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveAgent(agent.id, 'up')} disabled={idx === 0} className="p-0.5 text-muted-foreground/40 hover:text-foreground disabled:opacity-20 transition-colors">
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => moveAgent(agent.id, 'down')} disabled={idx === agents.length - 1} className="p-0.5 text-muted-foreground/40 hover:text-foreground disabled:opacity-20 transition-colors">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Icon */}
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/15 flex-shrink-0">
                  <Icon className="w-5 h-5" />
                </div>

                {/* Name + description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground truncate text-sm">{agent.name}</h3>
                    {!agent.isActive && <Badge variant="secondary">Inativo</Badge>}
                  </div>
                  {agent.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{agent.description}</p>
                  )}
                </div>

                {/* Provider badge + model */}
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <Badge variant={agent.provider === 'anthropic' ? 'anthropic' : 'openai'}>
                    {agent.provider === 'anthropic' ? 'Claude' : 'GPT'}
                  </Badge>
                  <span className="text-xs text-muted-foreground hidden sm:block font-mono">{agent.model}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={() => openEdit(agent)}>Editar</Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowDelete(agent)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Agente' : 'Novo Agente'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Nome *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Estrategista de Branding" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Ícone</Label>
                <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2"><IconComp className="w-4 h-4" /><SelectValue /></div>
                  </SelectTrigger>
                  <SelectContent>
                    {ICONS.map((icon) => {
                      const I = ICON_COMPONENTS[icon] || Bot;
                      return <SelectItem key={icon} value={icon}><div className="flex items-center gap-2"><I className="w-4 h-4" />{icon}</div></SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Breve descrição do que este agente faz" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Provider</Label>
                <Select value={form.provider} onValueChange={handleProviderChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                    <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Modelo</Label>
                <Select value={form.model} onValueChange={(v) => setForm({ ...form, model: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MODELS[form.provider]?.map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Temperatura: {form.temperature.toFixed(1)}</Label>
              <Slider min={0} max={1} step={0.1} value={[form.temperature]} onValueChange={([v]) => setForm({ ...form, temperature: v })} />
              <div className="flex justify-between text-xs text-muted-foreground/70">
                <span>Mais preciso (0)</span><span>Mais criativo (1)</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Max Tokens</Label>
              <Input type="number" value={form.maxTokens} onChange={(e) => setForm({ ...form, maxTokens: parseInt(e.target.value) || 4096 })} min={256} max={16384} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Link do Tutorial (opcional)</Label>
              <Input value={form.tutorialUrl || ''} onChange={(e) => setForm({ ...form, tutorialUrl: e.target.value || null })} placeholder="https://youtube.com/watch?v=..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">System Prompt *</Label>
              <Textarea value={form.systemPrompt} onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })} placeholder="Instruções detalhadas para o agente..." rows={8} className="font-mono text-xs" />
            </div>
            <div className="flex items-center gap-3 py-1">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              <Label className="text-foreground text-sm cursor-pointer">Agente ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim() || !form.systemPrompt.trim()}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editing ? 'Salvar' : 'Criar Agente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!showDelete} onOpenChange={() => setShowDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir Agente</DialogTitle></DialogHeader>
          <p className="text-muted-foreground text-sm">
            Tem certeza que deseja excluir <span className="text-foreground font-semibold">"{showDelete?.name}"</span>? Todas as conversas com este agente serão removidas.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
