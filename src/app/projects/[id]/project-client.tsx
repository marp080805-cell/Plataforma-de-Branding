'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Link from 'next/link';
import {
  ChevronRight, Upload, FileText, Trash2, Loader2, Brain,
  BookOpen, Search, Bot, CheckCircle2, File, Image, PlayCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatBytes, formatDate } from '@/lib/utils';

interface Document {
  id: string; name: string; filename: string;
  mimeType: string; size: number; createdAt: string;
}

interface Agent {
  id: string; name: string; description: string; icon: string;
  provider: string; hasConversation: boolean; tutorialUrl: string | null;
}

interface Project {
  id: string; name: string; description: string | null;
  color: string; documents: Document[];
}

interface Props { project: Project; agents: Agent[]; }

function getFileIcon(mimeType: string, name: string) {
  if (mimeType.startsWith('image/')) return <Image className="w-4 h-4 text-blue-500" />;
  if (mimeType === 'application/pdf') return <FileText className="w-4 h-4 text-red-500" />;
  if (name.endsWith('.docx') || name.endsWith('.doc')) return <FileText className="w-4 h-4 text-blue-500" />;
  return <File className="w-4 h-4 text-muted-foreground" />;
}

function getAgentIcon(iconName: string) {
  const icons: Record<string, React.ElementType> = { 'brain': Brain, 'book-open': BookOpen, 'search': Search, 'bot': Bot };
  const Icon = icons[iconName] || Bot;
  return <Icon className="w-6 h-6" />;
}

export function ProjectClient({ project, agents }: Props) {
  const [allDocs, setAllDocs] = useState<Document[]>(project.documents);
  const [uploading, setUploading] = useState(false);

  const fetchDocs = async () => {
    const res = await fetch(`/api/projects/${project.id}`);
    const data = await res.json();
    setAllDocs(data.documents || []);
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);
    for (const file of acceptedFiles) {
      const formData = new FormData();
      formData.append('file', file);
      await fetch(`/api/projects/${project.id}/documents`, { method: 'POST', body: formData });
    }
    await fetchDocs();
    setUploading(false);
  }, [project.id]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
    maxSize: 20 * 1024 * 1024,
    multiple: true,
  });

  const deleteDoc = async (docId: string) => {
    await fetch(`/api/projects/${project.id}/documents/${docId}`, { method: 'DELETE' });
    setAllDocs((prev) => prev.filter((d) => d.id !== docId));
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Projetos</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">{project.name}</span>
      </div>

      {/* Project Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-1 h-10 rounded-full" style={{ backgroundColor: project.color }} />
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground text-sm mt-0.5">{project.description}</p>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Documents Section */}
        <section className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <div className="w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-primary" />
            </div>
            Documentos da Marca
            {allDocs.length > 0 && (
              <span className="ml-auto text-xs font-normal text-muted-foreground">{allDocs.length} arquivo{allDocs.length !== 1 ? 's' : ''}</span>
            )}
          </h2>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 mb-4 ${
              isDragActive
                ? 'border-primary/60 bg-primary/5'
                : 'border-border hover:border-primary/40 hover:bg-muted/30'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-2">
              {uploading ? (
                <Loader2 className="w-7 h-7 text-primary animate-spin" />
              ) : (
                <Upload className="w-7 h-7 text-muted-foreground" />
              )}
              <p className="text-sm font-medium text-foreground">
                {isDragActive ? 'Solte os arquivos aqui...' : uploading ? 'Enviando e extraindo texto...' : 'Arraste arquivos ou clique para selecionar'}
              </p>
              <p className="text-xs text-muted-foreground">PDF, DOCX, TXT, MD, PNG, JPG — máx. 20MB</p>
            </div>
          </div>

          {/* Document list */}
          {allDocs.length > 0 ? (
            <div className="space-y-1.5">
              {allDocs.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:bg-muted/30 group transition-colors">
                  {getFileIcon(doc.mimeType, doc.name)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(doc.size)} · {formatDate(doc.createdAt)}</p>
                  </div>
                  <button onClick={() => deleteDoc(doc.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : !uploading ? (
            <p className="text-center text-xs text-muted-foreground py-4">
              Nenhum documento ainda. Faça upload dos arquivos da marca.
            </p>
          ) : null}
        </section>

        {/* Agents Section */}
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <div className="w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            Agentes Disponíveis
            {agents.length > 0 && (
              <span className="ml-auto text-xs font-normal text-muted-foreground">{agents.length} agente{agents.length !== 1 ? 's' : ''}</span>
            )}
          </h2>

          {agents.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border/60 p-10 text-center">
              <Bot className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm font-medium">Nenhum agente configurado ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {agents.map((agent) => (
                <div key={agent.id} className="bg-card rounded-2xl border border-border/60 hover:border-primary/30 hover:shadow-md transition-all duration-200 group overflow-hidden flex flex-col">
                  <Link href={`/projects/${project.id}/agents/${agent.id}`} className="p-5 flex-1">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary/15 transition-colors border border-primary/15">
                        {getAgentIcon(agent.icon)}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <Badge variant={agent.provider === 'anthropic' ? 'anthropic' : 'openai'}>
                          {agent.provider === 'anthropic' ? 'Claude' : 'GPT'}
                        </Badge>
                        {agent.hasConversation && (
                          <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                            <CheckCircle2 className="w-3 h-3" />Ativo
                          </span>
                        )}
                      </div>
                    </div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-1 text-sm">{agent.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{agent.description}</p>
                  </Link>
                  {agent.tutorialUrl && (
                    <div className="px-5 pb-4">
                      <a href={agent.tutorialUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-primary hover:text-secondary font-medium transition-colors border border-primary/20 rounded-lg px-3 py-2 hover:bg-primary/5 w-full justify-center"
                        onClick={(e) => e.stopPropagation()}>
                        <PlayCircle className="w-3.5 h-3.5" />Ver Tutorial
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
