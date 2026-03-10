'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, FolderOpen, FileText, MoreVertical, Loader2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate, truncate } from '@/lib/utils';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  createdAt: string;
  updatedAt: string;
  _count: { documents: number; conversations: number };
}

const PRESET_COLORS = [
  '#7c6ef5', '#9f7aea', '#e879f9', '#f472b6',
  '#fb923c', '#facc15', '#4ade80', '#34d399',
  '#22d3ee', '#60a5fa',
];

export function DashboardClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<Project | null>(null);
  const [showDelete, setShowDelete] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ name: '', description: '', color: '#7c6ef5' });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    const res = await fetch('/api/projects');
    const data = await res.json();
    setProjects(data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowCreate(false);
    setForm({ name: '', description: '', color: '#6366f1' });
    setSaving(false);
    fetchProjects();
  };

  const handleEdit = async () => {
    if (!showEdit || !form.name.trim()) return;
    setSaving(true);
    await fetch(`/api/projects/${showEdit.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowEdit(null);
    setSaving(false);
    fetchProjects();
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    setSaving(true);
    await fetch(`/api/projects/${showDelete.id}`, { method: 'DELETE' });
    setShowDelete(null);
    setSaving(false);
    fetchProjects();
  };

  const openEdit = (project: Project) => {
    setForm({ name: project.name, description: project.description || '', color: project.color });
    setShowEdit(project);
  };

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-semibold text-[#e0e0f0] tracking-tight">Projetos</h1>
          <p className="text-[#50506a] text-sm mt-0.5">
            {projects.length} {projects.length === 1 ? 'projeto' : 'projetos'}
          </p>
        </div>
        <Button onClick={() => { setForm({ name: '', description: '', color: '#7c6ef5' }); setShowCreate(true); }}>
          <Plus className="w-4 h-4 mr-1.5" />
          Novo Projeto
        </Button>
      </div>

      {/* Search */}
      {projects.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#404060]" />
          <Input
            placeholder="Buscar projetos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Projects Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-5 h-5 animate-spin text-[#7c6ef5]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-14 h-14 bg-white/[0.04] border border-white/[0.07] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-6 h-6 text-[#404060]" />
          </div>
          <h3 className="text-base font-medium text-[#c0c0d8] mb-1.5">
            {search ? 'Nenhum projeto encontrado' : 'Nenhum projeto ainda'}
          </h3>
          <p className="text-[#505070] text-sm mb-6 max-w-xs mx-auto">
            {search
              ? 'Tente buscar por outro nome'
              : 'Organize seus clientes em projetos separados com agentes dedicados'}
          </p>
          {!search && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Criar Projeto
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((project) => (
            <div
              key={project.id}
              className="bg-[#0f0f18] border border-white/[0.07] rounded-2xl overflow-hidden hover:border-white/[0.13] transition-all duration-300 group"
            >
              {/* Color accent bar */}
              <div className="h-[3px] opacity-80" style={{ backgroundColor: project.color }} />

              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/projects/${project.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0 opacity-80"
                        style={{ backgroundColor: project.color }}
                      />
                      <h3 className="font-medium text-[#d8d8f0] group-hover:text-[#e8e8ff] transition-colors truncate text-sm">
                        {project.name}
                      </h3>
                    </div>
                    {project.description && (
                      <p className="text-[#505070] text-xs leading-relaxed pl-4.5">
                        {truncate(project.description, 75)}
                      </p>
                    )}
                  </Link>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 rounded-lg hover:bg-white/[0.07] transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0">
                        <MoreVertical className="w-3.5 h-3.5 text-[#606080]" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(project)}>
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="!text-[#ff7070] hover:!bg-[#c93030]/[0.12]"
                        onClick={() => setShowDelete(project)}
                      >
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-4 mt-4 pt-3.5 border-t border-white/[0.05] text-xs text-[#48485e]">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3 h-3" />
                    {project._count.documents} {project._count.documents === 1 ? 'doc' : 'docs'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    {formatDate(project.updatedAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Projeto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[#8080a0] text-xs">Nome do projeto *</Label>
              <Input
                placeholder="Ex: Marca XYZ"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[#8080a0] text-xs">Descrição (opcional)</Label>
              <Textarea
                placeholder="Breve descrição do projeto..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#8080a0] text-xs">Cor de identificação</Label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    className="w-7 h-7 rounded-full transition-all duration-150 hover:scale-110"
                    style={{
                      backgroundColor: color,
                      outline: form.color === color ? `2px solid ${color}` : 'none',
                      outlineOffset: '2px',
                      transform: form.color === color ? 'scale(1.1)' : undefined,
                    }}
                    onClick={() => setForm({ ...form, color })}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving || !form.name.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Criar Projeto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!showEdit} onOpenChange={() => setShowEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Projeto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[#8080a0] text-xs">Nome do projeto *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[#8080a0] text-xs">Descrição (opcional)</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#8080a0] text-xs">Cor de identificação</Label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    className="w-7 h-7 rounded-full transition-all duration-150 hover:scale-110"
                    style={{
                      backgroundColor: color,
                      outline: form.color === color ? `2px solid ${color}` : 'none',
                      outlineOffset: '2px',
                      transform: form.color === color ? 'scale(1.1)' : undefined,
                    }}
                    onClick={() => setForm({ ...form, color })}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(null)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={saving || !form.name.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Modal */}
      <Dialog open={!!showDelete} onOpenChange={() => setShowDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Projeto</DialogTitle>
          </DialogHeader>
          <p className="text-[#7070a0] text-sm">
            Tem certeza que deseja excluir{' '}
            <span className="text-[#c0c0d8] font-medium">"{showDelete?.name}"</span>? Todos os documentos e conversas serão
            removidos permanentemente.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
