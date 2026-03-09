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
      <div className="flex items-center gap-1.5 text-sm text-zinc-500 mb-6">
        <Link href="/dashboard" className="hover:text-zinc-700 transition-colors">
          Projetos
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-medium text-zinc-900">{project.name}</span>
      </div>

      {/* Project Header */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-4 h-12 rounded-full"
          style={{ backgroundColor: project.color }}
        />
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{project.name}</h1>
          {project.description && (
            <p className="text-zinc-500 text-sm mt-0.5">{project.description}</p>
          )}
        </div>
      </div>

      <div className="space-y-8">
        {/* Documents Section */}
        <section className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            Documentos da Marca
          </h2>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 mb-4 ${
              isDragActive
                ? 'border-indigo-400 bg-indigo-50'
                : 'border-zinc-200 hover:border-indigo-300 hover:bg-zinc-50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-2">
              {uploading ? (
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              ) : (
                <Upload className="w-8 h-8 text-zinc-400" />
              )}
              <p className="text-sm font-medium text-zinc-700">
                {isDragActive
                  ? 'Solte os arquivos aqui...'
                  : uploading
                  ? 'Enviando e extraindo texto...'
                  : 'Arraste arquivos ou clique para selecionar'}
              </p>
              <p className="text-xs text-zinc-400">
                PDF, DOCX, TXT, MD, PNG, JPG — máx. 20MB por arquivo
              </p>
            </div>
          </div>

          {/* Document list */}
          {allDocs.length > 0 ? (
            <div className="space-y-2">
              {allDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-zinc-100 hover:bg-zinc-50 group transition-colors"
                >
                  {getFileIcon(doc.mimeType, doc.name)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 truncate">{doc.name}</p>
                    <p className="text-xs text-zinc-400">
                      {formatBytes(doc.size)} • {formatDate(doc.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteDoc(doc.id)}
                    className="p-1.5 rounded text-zinc-400 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : !uploading ? (
            <p className="text-center text-sm text-zinc-400 py-4">
              Nenhum documento ainda. Faça upload dos arquivos da marca.
            </p>
          ) : null}
        </section>

        {/* Agents Section */}
        <section>
          <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-500" />
            Agentes Disponíveis
          </h2>

          {agents.length === 0 ? (
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-8 text-center">
              <Bot className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
              <p className="text-zinc-500 text-sm">Nenhum agente configurado ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/projects/${project.id}/agents/${agent.id}`}
                  className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5 hover:shadow-md hover:border-indigo-200 transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                      {getAgentIcon(agent.icon)}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={agent.provider === 'anthropic' ? 'anthropic' : 'openai'}>
                        {agent.provider === 'anthropic' ? 'Claude' : 'GPT'}
                      </Badge>
                      {agent.hasConversation && (
                        <span className="flex items-center gap-1 text-xs text-emerald-600">
                          <CheckCircle2 className="w-3 h-3" />
                          Ativo
                        </span>
                      )}
                    </div>
                  </div>
                  <h3 className="font-semibold text-zinc-900 group-hover:text-indigo-700 transition-colors mb-1">
                    {agent.name}
                  </h3>
                  <p className="text-xs text-zinc-500 line-clamp-2">{agent.description}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
