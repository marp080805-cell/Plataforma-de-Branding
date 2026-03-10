'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import Link from 'next/link';
import {
  ChevronRight, Upload, FileText, Trash2, Loader2, Brain,
  BookOpen, Search, Bot, CheckCircle2, File, Image,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatBytes, formatDate } from '@/lib/utils';

interface Document {
  id: string;
  name: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  provider: string;
  hasConversation: boolean;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  documents: Document[];
}

interface Props {
  project: Project;
  agents: Agent[];
}

function getFileIcon(mimeType: string, name: string) {
  if (mimeType.startsWith('image/')) return <Image className="w-4 h-4 text-blue-500" />;
  if (mimeType === 'application/pdf') return <FileText className="w-4 h-4 text-red-500" />;
  if (name.endsWith('.docx') || name.endsWith('.doc')) return <FileText className="w-4 h-4 text-blue-600" />;
  return <File className="w-4 h-4 text-zinc-500" />;
}

function getAgentIcon(iconName: string) {
  const icons: Record<string, React.ElementType> = {
    'brain': Brain,
    'book-open': BookOpen,
    'search': Search,
    'bot': Bot,
  };
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

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setUploading(true);
      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        await fetch(`/api/projects/${project.id}/documents`, {
          method: 'POST',
          body: formData,
        });
      }
      await fetchDocs();
      setUploading(false);
    },
    [project.id]
  );

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
      <div className="flex items-center gap-1.5 text-xs text-[#404060] mb-6">
        <Link href="/dashboard" className="hover:text-[#8080a0] transition-colors">
          Projetos
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-[#9090b0]">{project.name}</span>
      </div>

      {/* Project Header */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-1 h-10 rounded-full opacity-80"
          style={{ backgroundColor: project.color }}
        />
        <div>
          <h1 className="text-lg font-semibold text-[#e0e0f0] tracking-tight">{project.name}</h1>
          {project.description && (
            <p className="text-[#505070] text-sm mt-0.5">{project.description}</p>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Documents Section */}
        <section className="bg-[#0f0f18] rounded-2xl border border-white/[0.07] p-6">
          <h2 className="text-sm font-semibold text-[#c0c0d8] mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#7c6ef5]" />
            Documentos da Marca
          </h2>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 mb-4 ${
              isDragActive
                ? 'border-[#7c6ef5]/60 bg-[#7c6ef5]/[0.06]'
                : 'border-white/[0.07] hover:border-[#7c6ef5]/30 hover:bg-white/[0.02]'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-2">
              {uploading ? (
                <Loader2 className="w-7 h-7 text-[#7c6ef5] animate-spin" />
              ) : (
                <Upload className="w-7 h-7 text-[#404060]" />
              )}
              <p className="text-sm font-medium text-[#9090b0]">
                {isDragActive
                  ? 'Solte os arquivos aqui...'
                  : uploading
                  ? 'Enviando e extraindo texto...'
                  : 'Arraste arquivos ou clique para selecionar'}
              </p>
              <p className="text-xs text-[#404058]">
                PDF, DOCX, TXT, MD, PNG, JPG — máx. 20MB
              </p>
            </div>
          </div>

          {/* Document list */}
          {allDocs.length > 0 ? (
            <div className="space-y-1.5">
              {allDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.05] hover:bg-white/[0.03] group transition-colors"
                >
                  {getFileIcon(doc.mimeType, doc.name)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#c0c0d8] truncate">{doc.name}</p>
                    <p className="text-xs text-[#404058]">
                      {formatBytes(doc.size)} · {formatDate(doc.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteDoc(doc.id)}
                    className="p-1.5 rounded-lg text-[#404060] hover:text-[#ff7070] hover:bg-[#c93030]/[0.1] transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : !uploading ? (
            <p className="text-center text-xs text-[#404058] py-4">
              Nenhum documento ainda. Faça upload dos arquivos da marca.
            </p>
          ) : null}
        </section>

        {/* Agents Section */}
        <section>
          <h2 className="text-sm font-semibold text-[#c0c0d8] mb-4 flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#7c6ef5]" />
            Agentes Disponíveis
          </h2>

          {agents.length === 0 ? (
            <div className="bg-[#0f0f18] rounded-2xl border border-white/[0.07] p-10 text-center">
              <Bot className="w-7 h-7 text-[#303050] mx-auto mb-2" />
              <p className="text-[#505070] text-sm">Nenhum agente configurado ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {agents.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/projects/${project.id}/agents/${agent.id}`}
                  className="bg-[#0f0f18] rounded-2xl border border-white/[0.07] p-5 hover:border-[#7c6ef5]/30 hover:bg-[#7c6ef5]/[0.03] transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="w-11 h-11 bg-[#7c6ef5]/[0.1] rounded-xl flex items-center justify-center text-[#9d90ff] group-hover:bg-[#7c6ef5]/[0.15] transition-colors border border-[#7c6ef5]/[0.15]">
                      {getAgentIcon(agent.icon)}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge variant={agent.provider === 'anthropic' ? 'anthropic' : 'openai'}>
                        {agent.provider === 'anthropic' ? 'Claude' : 'GPT'}
                      </Badge>
                      {agent.hasConversation && (
                        <span className="flex items-center gap-1 text-xs text-[#34d399]">
                          <CheckCircle2 className="w-3 h-3" />
                          Ativo
                        </span>
                      )}
                    </div>
                  </div>
                  <h3 className="font-medium text-[#c8c8e8] group-hover:text-[#e0e0ff] transition-colors mb-1 text-sm">
                    {agent.name}
                  </h3>
                  <p className="text-xs text-[#505070] line-clamp-2 leading-relaxed">{agent.description}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
