'use client';

import { useState, useEffect } from 'react';
import { Plus, Loader2, Trash2, UserCheck, UserX, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatDate, getInitials } from '@/lib/utils';
import { useSession } from 'next-auth/react';

interface User {
  id: string; name: string; email: string; role: string;
  avatarColor: string; isActive: boolean;
  dailySpendLimit: number | null; createdAt: string;
  _count?: { projects: number };
}

interface Project {
  id: string; name: string; description?: string; color: string; updatedAt: string;
  _count: { documents: number; conversations: number };
}

const AVATAR_COLORS = ['#176968','#47847E','#ec4899','#ef4444','#f97316','#eab308','#22c55e','#10b981'];

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
    name: '', email: '', password: '', role: 'strategist',
    avatarColor: '#176968', dailySpendLimit: '' as string,
  });

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/users');
    setUsers(await res.json());
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name:'', email:'', password:'', role:'strategist', avatarColor:'#176968', dailySpendLimit:'' });
    setShowForm(true);
  };
  const openEdit = (user: User) => {
    setEditing(user);
    setForm({ name:user.name, email:user.email, password:'', role:user.role,
      avatarColor:user.avatarColor, dailySpendLimit: user.dailySpendLimit != null ? String(user.dailySpendLimit) : '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, dailySpendLimit: form.dailySpendLimit ? parseFloat(form.dailySpendLimit) : null };
    if (editing) {
      await fetch(`/api/admin/users/${editing.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
    } else {
      await fetch('/api/admin/users', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
    }
    setSaving(false); setShowForm(false); fetchUsers();
  };

  const toggleActive = async (user: User) => {
    await fetch(`/api/admin/users/${user.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ isActive: !user.isActive }) });
    fetchUsers();
  };

  const openProjects = async (user: User) => {
    setViewingProjects(user); setLoadingProjects(true);
    const res = await fetch(`/api/projects?userId=${user.id}`);
    setUserProjects(await res.json());
    setLoadingProjects(false);
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    await fetch(`/api/admin/users/${showDelete.id}`, { method:'DELETE' });
    setShowDelete(null); fetchUsers();
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Usuários</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie os usuários da plataforma</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1.5" />Novo Usuário</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3.5">Usuário</th>
                <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3.5">Email</th>
                <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3.5">Perfil</th>
                <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3.5">Projetos</th>
                <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3.5">Status</th>
                <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3.5">Criado</th>
                <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3.5">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => (
                <tr key={user.id} className={`border-b border-border/40 hover:bg-muted/20 transition-colors ${i === users.length - 1 ? 'border-b-0' : ''}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 ring-2 ring-border/40"
                        style={{ backgroundColor: user.avatarColor }}>
                        {getInitials(user.name)}
                      </div>
                      <span className="text-sm font-medium text-foreground">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{user.email}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role === 'admin' ? 'Admin' : 'Estrategista'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => openProjects(user)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors font-medium">
                      <FolderOpen className="w-3.5 h-3.5" />
                      {user._count?.projects ?? 0}
                    </button>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={user.isActive ? 'openai' : 'destructive'}>
                      {user.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground">{formatDate(user.createdAt)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => openEdit(user)}>Editar</Button>
                      {user.id !== session?.user.id && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => toggleActive(user)} className="text-muted-foreground hover:text-foreground">
                            {user.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setShowDelete(user)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
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
          <DialogHeader><DialogTitle>{editing ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">{editing ? 'Nova senha (deixe em branco para manter)' : 'Senha *'}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Perfil</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="strategist">Estrategista</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Limite de gasto diário (USD)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">$</span>
                <Input type="number" min="0" step="0.01" value={form.dailySpendLimit}
                  onChange={(e) => setForm({ ...form, dailySpendLimit: e.target.value })} placeholder="Ex: 2.00" className="pl-6" />
              </div>
              <p className="text-muted-foreground/70 text-[11px]">Deixe em branco para sem limite. Renova à meia-noite.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Cor do avatar</Label>
              <div className="flex gap-2">
                {AVATAR_COLORS.map((color) => (
                  <button key={color} className="w-7 h-7 rounded-full transition-all duration-150 hover:scale-110"
                    style={{ backgroundColor: color, outline: form.avatarColor === color ? `2px solid ${color}` : 'none',
                      outlineOffset: '2px', transform: form.avatarColor === color ? 'scale(1.1)' : undefined }}
                    onClick={() => setForm({ ...form, avatarColor: color })} />
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
          <DialogHeader><DialogTitle>Projetos de {viewingProjects?.name}</DialogTitle></DialogHeader>
          {loadingProjects ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : userProjects.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Nenhum projeto criado.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {userProjects.map((project) => (
                <div key={project.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
                    {project.description && <p className="text-xs text-muted-foreground truncate">{project.description}</p>}
                  </div>
                  <div className="text-xs text-muted-foreground flex-shrink-0 text-right">
                    <div>{project._count.documents} docs</div>
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
          <DialogHeader><DialogTitle>Excluir Usuário</DialogTitle></DialogHeader>
          <p className="text-muted-foreground text-sm">
            Tem certeza que deseja excluir <span className="text-foreground font-semibold">"{showDelete?.name}"</span>? Esta ação não pode ser desfeita.
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
