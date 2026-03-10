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
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (mais rápido)' },
    { id: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' },
    { id: 'claude-opus-4-5-20251101', label: 'Claude Opus 4.5' },
    { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
  ],
  openai: [
    { id: 'gpt-5.4', label: 'GPT-5.4 (mais poderoso)' },
    { id: 'gpt-5.4-pro', label: 'GPT-5.4 Pro (máxima performance)' },
    { id: 'gpt-5', label: 'GPT-5' },
    { id: 'gpt-5-mini', label: 'GPT-5 Mini' },
    { id: 'gpt-5-nano', label: 'GPT-5 Nano (mais rápido)' },
    { id: 'gpt-4.1', label: 'GPT-4.1' },
    { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
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
          <h1 className="text-lg font-semibold text-[#e0e0f0] tracking-tight">Agentes</h1>
          <p className="text-[#505070] text-sm mt-0.5">Configure os agentes de IA da plataforma</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1.5" />
          Novo Agente
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-[#7c6ef5]" />
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-20 bg-[#0f0f18] rounded-2xl border border-white/[0.07]">
          <Bot className="w-7 h-7 text-[#303050] mx-auto mb-2" />
          <p className="text-[#505070] text-sm">Nenhum agente criado ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {agents.map((agent, idx) => {
            const Icon = ICON_COMPONENTS[agent.icon] || Bot;
            return (
              <div
                key={agent.id}
                className="bg-[#0f0f18] rounded-xl border border-white/[0.07] p-4 flex items-center gap-4 hover:border-white/[0.11] transition-colors"
              >
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveAgent(agent.id, 'up')} disabled={idx === 0} className="p-0.5 text-[#303050] hover:text-[#7070a0] disabled:opacity-20 transition-colors">
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => moveAgent(agent.id, 'down')} disabled={idx === agents.length - 1} className="p-0.5 text-[#303050] hover:text-[#7070a0] disabled:opacity-20 transition-colors">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="w-9 h-9 bg-[#7c6ef5]/[0.1] rounded-xl flex items-center justify-center text-[#9d90ff] border border-[#7c6ef5]/[0.15]">
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-[#c8c8e8] truncate text-sm">{agent.name}</h3>
                    {!agent.isActive && (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </div>
                  <p className="text-xs text-[#505070] truncate mt-0.5">{agent.description}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={agent.provider === 'anthropic' ? 'anthropic' : 'openai'}>
                    {agent.provider === 'anthropic' ? 'Claude' : 'GPT'}
                  </Badge>
                  <span className="text-xs text-[#404060] hidden sm:block">{agent.model}</span>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={() => openEdit(agent)}>
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowDelete(agent)} className="text-[#404060] hover:text-[#ff7070] hover:bg-[#c93030]/[0.1]">
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
                <Label className="text-[#8080a0] text-xs">Nome *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Estrategista de Branding" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[#8080a0] text-xs">Ícone</Label>
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
              <Label className="text-[#8080a0] text-xs">Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Breve descrição do que este agente faz" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[#8080a0] text-xs">Provider</Label>
                <Select value={form.provider} onValueChange={handleProviderChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                    <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[#8080a0] text-xs">Modelo</Label>
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
              <Label className="text-[#8080a0] text-xs">Temperatura: {form.temperature.toFixed(1)}</Label>
              <Slider
                min={0}
                max={1}
                step={0.1}
                value={[form.temperature]}
                onValueChange={([v]) => setForm({ ...form, temperature: v })}
              />
              <div className="flex justify-between text-xs text-[#404060]">
                <span>Mais preciso (0)</span>
                <span>Mais criativo (1)</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[#8080a0] text-xs">Max Tokens</Label>
              <Input
                type="number"
                value={form.maxTokens}
                onChange={(e) => setForm({ ...form, maxTokens: parseInt(e.target.value) || 4096 })}
                min={256}
                max={16384}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[#8080a0] text-xs">System Prompt *</Label>
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
              <Label className="text-[#9090b0] text-sm">Agente ativo</Label>
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
          <p className="text-[#7070a0] text-sm">
            Tem certeza que deseja excluir <span className="text-[#c0c0d8] font-medium">"{showDelete?.name}"</span>? Todas as conversas com este agente serão removidas.
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
