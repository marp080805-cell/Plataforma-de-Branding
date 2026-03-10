'use client';

import { useState, useEffect } from 'react';
import { Plus, Loader2, Trash2, GripVertical, ChevronUp, ChevronDown, Brain, BookOpen, Search, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

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
}

const ICONS = ['brain', 'book-open', 'search', 'bot'];
const ICON_COMPONENTS: Record<string, React.ElementType> = {
  'brain': Brain,
  'book-open': BookOpen,
  'search': Search,
  'bot': Bot,
};

const MODELS: Record<string, { id: string; label: string }[]> = {
  anthropic: [
    { id: 'claude-opus-4-6', label: 'Claude Opus 4.6 (mais poderoso)' },
    { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (recomendado)' },
    { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (mais rápido)' },
    { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
    { id: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    { id: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
  ],
  openai: [
    { id: 'gpt-4o', label: 'GPT-4o (recomendado)' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini (mais rápido)' },
    { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { id: 'gpt-4', label: 'GPT-4' },
    { id: 'o1', label: 'o1 (raciocínio avançado)' },
    { id: 'o1-mini', label: 'o1 Mini' },
    { id: 'o3-mini', label: 'o3 Mini' },
    { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
};

const defaultAgent: Omit<Agent, 'id' | 'sortOrder'> = {
  name: '',
  description: '',
  icon: 'brain',
  systemPrompt: '',
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  temperature: 0.7,
  maxTokens: 4096,
  isActive: true,
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
    const data = await res.json();
    setAgents(data);
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(defaultAgent);
    setShowForm(true);
  };

  const openEdit = (agent: Agent) => {
    setEditing(agent);
    setForm({
      name: agent.name,
      description: agent.description,
      icon: agent.icon,
      systemPrompt: agent.systemPrompt,
      provider: agent.provider,
      model: agent.model,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      isActive: agent.isActive,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.systemPrompt.trim()) return;
    setSaving(true);
    if (editing) {
      await fetch(`/api/admin/agents/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    } else {
      await fetch('/api/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    }
    setSaving(false);
    setShowForm(false);
    fetchAgents();
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    await fetch(`/api/admin/agents/${showDelete.id}`, { method: 'DELETE' });
    setShowDelete(null);
    fetchAgents();
  };

  const moveAgent = async (id: string, direction: 'up' | 'down') => {
    const index = agents.findIndex((a) => a.id === id);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === agents.length - 1)) return;

    const newAgents = [...agents];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    [newAgents[index], newAgents[swapIdx]] = [newAgents[swapIdx], newAgents[index]];
    setAgents(newAgents);

    await fetch('/api/admin/agents/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: newAgents.map((a) => a.id) }),
    });
  };

  const handleProviderChange = (provider: string) => {
    setForm({ ...form, provider, model: MODELS[provider][0].id });
  };

  const IconComp = ICON_COMPONENTS[form.icon] || Bot;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Agentes</h1>
          <p className="text-zinc-500 text-sm">Configure os agentes de IA da plataforma</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Agente
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-zinc-200">
          <Bot className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
          <p className="text-zinc-500">Nenhum agente criado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map((agent, idx) => {
            const Icon = ICON_COMPONENTS[agent.icon] || Bot;
            return (
              <div
                key={agent.id}
                className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 flex items-center gap-4"
              >
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveAgent(agent.id, 'up')} disabled={idx === 0} className="p-0.5 text-zinc-300 hover:text-zinc-600 disabled:opacity-20">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button onClick={() => moveAgent(agent.id, 'down')} disabled={idx === agents.length - 1} className="p-0.5 text-zinc-300 hover:text-zinc-600 disabled:opacity-20">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-zinc-900 truncate">{agent.name}</h3>
                    {!agent.isActive && (
                      <Badge variant="secondary" className="text-xs">Inativo</Badge>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 truncate">{agent.description}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={agent.provider === 'anthropic' ? 'anthropic' : 'openai'}>
                    {agent.provider === 'anthropic' ? 'Claude' : 'GPT'}
                  </Badge>
                  <span className="text-xs text-zinc-400">{agent.model}</span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={() => openEdit(agent)}>
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowDelete(agent)} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50">
                    <Trash2 className="w-4 h-4" />
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
                <Label>Nome *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Estrategista de Branding" />
              </div>
              <div className="space-y-1.5">
                <Label>Ícone</Label>
                <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <IconComp className="w-4 h-4" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {ICONS.map((icon) => {
                      const I = ICON_COMPONENTS[icon] || Bot;
                      return (
                        <SelectItem key={icon} value={icon}>
                          <div className="flex items-center gap-2">
                            <I className="w-4 h-4" />
                            {icon}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Breve descrição do que este agente faz" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Provider</Label>
                <Select value={form.provider} onValueChange={handleProviderChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                    <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Modelo</Label>
                <Select value={form.model} onValueChange={(v) => setForm({ ...form, model: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MODELS[form.provider]?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Temperatura: {form.temperature.toFixed(1)}</Label>
              <Slider
                min={0}
                max={1}
                step={0.1}
                value={[form.temperature]}
                onValueChange={([v]) => setForm({ ...form, temperature: v })}
              />
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Mais preciso (0)</span>
                <span>Mais criativo (1)</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Max Tokens</Label>
              <Input
                type="number"
                value={form.maxTokens}
                onChange={(e) => setForm({ ...form, maxTokens: parseInt(e.target.value) || 4096 })}
                min={256}
                max={16384}
              />
            </div>

            <div className="space-y-1.5">
              <Label>System Prompt *</Label>
              <Textarea
                value={form.systemPrompt}
                onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                placeholder="Instruções detalhadas para o agente..."
                rows={8}
                className="font-mono text-xs"
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
              <Label>Agente ativo</Label>
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
          <DialogHeader>
            <DialogTitle>Excluir Agente</DialogTitle>
          </DialogHeader>
          <p className="text-zinc-600 text-sm">
            Tem certeza que deseja excluir <strong>"{showDelete?.name}"</strong>? Todas as conversas com este agente serão removidas.
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
