'use client';

import { useState, useEffect } from 'react';
import { Plus, Loader2, Trash2, UserCheck, UserX, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { formatDate, getInitials } from '@/lib/utils';
import { useSession } from 'next-auth/react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarColor: string;
  isActive: boolean;
  createdAt: string;
  _count?: { projects: number };
}

interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  updatedAt: string;
  _count: { documents: number; conversations: number };
}

const AVATAR_COLORS = [
  '#176968', '#176968', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#10b981',
];

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [showDelete, setShowDelete] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewingProjects, setViewingProjects] = useState<User | null>(null);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'strategist', avatarColor: '#176968',
  });

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', email: '', password: '', role: 'strategist', avatarColor: '#176968' });
    setShowForm(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    setForm({ name: user.name, email: user.email, password: '', role: user.role, avatarColor: user.avatarColor });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    if (editing) {
      await fetch(`/api/admin/users/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    } else {
      await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    }
    setSaving(false);
    setShowForm(false);
    fetchUsers();
  };

  const toggleActive = async (user: User) => {
    await fetch(`/api/admin/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    fetchUsers();
  };

  const openProjects = async (user: User) => {
    setViewingProjects(user);
    setLoadingProjects(true);
    const res = await fetch(`/api/projects?userId=${user.id}`);
    const data = await res.json();
    setUserProjects(data);
    setLoadingProjects(false);
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    await fetch(`/api/admin/users/${showDelete.id}`, { method: 'DELETE' });
    setShowDelete(null);
    fetchUsers();
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-[#e0f0ef] tracking-tight">Usuários</h1>
          <p className="text-[#4a7070] text-sm mt-0.5">Gerencie os usuários da plataforma</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1.5" />
          Novo Usuário
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-[#176968]" />
        </div>
      ) : (
        <div className="bg-[#0d1515] rounded-2xl border border-white/[0.07] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                <th className="text-left text-[10px] font-semibold text-[#3a5e5c] uppercase tracking-wider px-4 py-3">Usuário</th>
                <th className="text-left text-[10px] font-semibold text-[#3a5e5c] uppercase tracking-wider px-4 py-3">Email</th>
                <th className="text-left text-[10px] font-semibold text-[#3a5e5c] uppercase tracking-wider px-4 py-3">Perfil</th>
                <th className="text-left text-[10px] font-semibold text-[#3a5e5c] uppercase tracking-wider px-4 py-3">Projetos</th>
                <th className="text-left text-[10px] font-semibold text-[#3a5e5c] uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-[10px] font-semibold text-[#3a5e5c] uppercase tracking-wider px-4 py-3">Criado</th>
                <th className="text-right text-[10px] font-semibold text-[#3a5e5c] uppercase tracking-wider px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                        style={{ backgroundColor: user.avatarColor }}
                      >
                        {getInitials(user.name)}
                      </div>
                      <span className="text-sm font-medium text-[#c8e8e6]">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#5a8280]">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role === 'admin' ? 'Admin' : 'Estrategista'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openProjects(user)}
                      className="flex items-center gap-1.5 text-sm text-[#6a9492] hover:text-[#176968] transition-colors"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      {user._count?.projects ?? 0}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.isActive ? 'openai' : 'destructive'}>
                      {user.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#3a5e5c]">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => openEdit(user)}>
                        Editar
                      </Button>
                      {user.id !== session?.user.id && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActive(user)}
                          >
                            {user.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowDelete(user)}
                            className="text-[#3a5e5c] hover:text-[#ff7070] hover:bg-[#c93030]/[0.1]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[#7a9e9c] text-xs">Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[#7a9e9c] text-xs">Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[#7a9e9c] text-xs">{editing ? 'Nova senha (deixe em branco para manter)' : 'Senha *'}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[#7a9e9c] text-xs">Perfil</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="strategist">Estrategista</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[#7a9e9c] text-xs">Cor do avatar</Label>
              <div className="flex gap-2">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    className="w-7 h-7 rounded-full transition-all duration-150 hover:scale-110"
                    style={{
                      backgroundColor: color,
                      outline: form.avatarColor === color ? `2px solid ${color}` : 'none',
                      outlineOffset: '2px',
                      transform: form.avatarColor === color ? 'scale(1.1)' : undefined,
                    }}
                    onClick={() => setForm({ ...form, avatarColor: color })}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim() || !form.email.trim() || (!editing && !form.password)}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editing ? 'Salvar' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Projects modal */}
      <Dialog open={!!viewingProjects} onOpenChange={() => setViewingProjects(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Projetos de {viewingProjects?.name}
            </DialogTitle>
          </DialogHeader>
          {loadingProjects ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-[#176968]" />
            </div>
          ) : userProjects.length === 0 ? (
            <p className="text-[#4a7070] text-sm text-center py-8">Nenhum projeto criado.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {userProjects.map((project) => (
                <div key={project.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#c8e8e6] truncate">{project.name}</p>
                    {project.description && (
                      <p className="text-xs text-[#4a7070] truncate">{project.description}</p>
                    )}
                  </div>
                  <div className="text-xs text-[#3a5e5c] flex-shrink-0 text-right">
                    <div>{project._count.documents} doc{project._count.documents !== 1 ? 's' : ''}</div>
                    <div>{project._count.conversations} conv</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingProjects(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!showDelete} onOpenChange={() => setShowDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Usuário</DialogTitle>
          </DialogHeader>
          <p className="text-[#6a9492] text-sm">
            Tem certeza que deseja excluir <span className="text-[#c0d8d6] font-medium">"{showDelete?.name}"</span>? Esta ação não pode ser desfeita.
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
