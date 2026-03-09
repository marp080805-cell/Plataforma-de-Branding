'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ChevronRight, Send, Trash2, Brain, BookOpen, Search, Bot,
  FileText, File, Image, ChevronLeft, ChevronDown, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface Document {
  id: string;
  name: string;
  mimeType: string;
  size: number;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  provider: string;
}

interface Project {
  id: string;
  name: string;
  color: string;
}

interface Conversation {
  id: string;
}

interface Props {
  project: Project;
  agent: Agent;
  conversation: Conversation;
  initialDocuments: Document[];
  selectedDocumentIds: string[];
}

function getAgentIcon(iconName: string) {
  const size = 'w-5 h-5';
  const icons: Record<string, React.ReactElement> = {
    'brain': <Brain className={size} />,
    'book-open': <BookOpen className={size} />,
    'search': <Search className={size} />,
    'bot': <Bot className={size} />,
  };
  return icons[iconName] || <Bot className={size} />;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <Image className="w-3.5 h-3.5 text-blue-500" />;
  if (mimeType === 'application/pdf') return <FileText className="w-3.5 h-3.5 text-red-500" />;
  return <File className="w-3.5 h-3.5 text-zinc-500" />;
}

export function ChatClient({
  project,
  agent,
  conversation,
  initialDocuments,
  selectedDocumentIds: initialSelectedIds,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesInit, setMessagesInit] = useState(false);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(initialSelectedIds);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!messagesInit) {
      setMessagesInit(true);
      fetchMessages();
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const fetchMessages = async () => {
    const res = await fetch(
      `/api/projects/${project.id}/agents/${agent.id}/conversation`
    );
    const data = await res.json();
    setMessages(data.messages || []);
    setSelectedDocIds(data.documents?.map((d: { documentId: string }) => d.documentId) || initialSelectedIds);
  };

  const saveDocSelection = useCallback(
    async (docIds: string[]) => {
      await fetch(`/api/projects/${project.id}/agents/${agent.id}/conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds: docIds }),
      });
    },
    [project.id, agent.id]
  );

  const toggleDoc = async (docId: string) => {
    const newSelected = selectedDocIds.includes(docId)
      ? selectedDocIds.filter((id) => id !== docId)
      : [...selectedDocIds, docId];
    setSelectedDocIds(newSelected);
    await saveDocSelection(newSelected);
  };

  const handleClearConversation = async () => {
    if (!confirm('Tem certeza? Isso apagará todo o histórico da conversa.')) return;
    await fetch(`/api/projects/${project.id}/agents/${agent.id}/conversation`, {
      method: 'DELETE',
    });
    setMessages([]);
  };

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || streaming) return;

    setInput('');
    setError('');

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: msg,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setStreaming(true);
    setStreamingContent('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: conversation.id, message: msg }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao enviar mensagem');
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.content) {
              fullContent += parsed.content;
              setStreamingContent(fullContent);
            }
          } catch {}
        }
      }

      if (fullContent) {
        const assistantMessage: Message = {
          id: `temp-assistant-${Date.now()}`,
          role: 'assistant',
          content: fullContent,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message || 'Erro ao se comunicar com o agente');
      }
    } finally {
      setStreaming(false);
      setStreamingContent('');
      await fetchMessages();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  return (
    <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } transition-all duration-200 overflow-hidden border-r border-zinc-200 bg-white flex-shrink-0`}
      >
        <div className="w-64 h-full flex flex-col">
          {/* Breadcrumb */}
          <div className="p-4 border-b border-zinc-100">
            <div className="flex items-center gap-1 text-xs text-zinc-400 mb-1">
              <Link href="/dashboard" className="hover:text-zinc-600">Projetos</Link>
              <ChevronRight className="w-3 h-3" />
              <Link href={`/projects/${project.id}`} className="hover:text-zinc-600 truncate">{project.name}</Link>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
              <span className="text-sm font-medium text-zinc-700 truncate">{project.name}</span>
            </div>
          </div>

          {/* Documents */}
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              Documentos ({selectedDocIds.length}/{initialDocuments.length})
            </h3>
            {initialDocuments.length === 0 ? (
              <p className="text-xs text-zinc-400">
                Nenhum documento no projeto.{' '}
                <Link href={`/projects/${project.id}`} className="text-indigo-500 hover:underline">
                  Adicionar
                </Link>
              </p>
            ) : (
              <div className="space-y-1">
                {initialDocuments.map((doc) => {
                  const selected = selectedDocIds.includes(doc.id);
                  return (
                    <label
                      key={doc.id}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                        selected ? 'bg-indigo-50' : 'hover:bg-zinc-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleDoc(doc.id)}
                        className="accent-indigo-600 w-3.5 h-3.5"
                      />
                      <span className="flex-shrink-0">{getFileIcon(doc.mimeType)}</span>
                      <span
                        className={`text-xs truncate ${
                          selected ? 'text-indigo-700 font-medium' : 'text-zinc-600'
                        }`}
                      >
                        {doc.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toggle sidebar button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute left-64 top-1/2 -translate-y-1/2 z-10 w-5 h-10 bg-white border border-zinc-200 rounded-r-md flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition-all duration-200 shadow-sm"
        style={{ left: sidebarOpen ? '256px' : '0px' }}
      >
        {sidebarOpen ? (
          <ChevronLeft className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
      </button>

      {/* Chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chat header */}
        <div className="bg-white border-b border-zinc-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
              {getAgentIcon(agent.icon)}
            </div>
            <div>
              <h2 className="font-semibold text-zinc-900 text-sm">{agent.name}</h2>
              <Badge
                variant={agent.provider === 'anthropic' ? 'anthropic' : 'openai'}
                className="text-xs"
              >
                {agent.provider === 'anthropic' ? 'Claude' : 'ChatGPT'}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearConversation}
            className="text-zinc-500 hover:text-rose-500"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Limpar
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {messages.length === 0 && !streaming && (
            <div className="text-center py-12">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto mb-3">
                {getAgentIcon(agent.icon)}
              </div>
              <h3 className="font-semibold text-zinc-900 mb-1">{agent.name}</h3>
              <p className="text-sm text-zinc-500 max-w-sm mx-auto">{agent.description}</p>
              {selectedDocIds.length > 0 && (
                <p className="text-xs text-indigo-500 mt-2">
                  {selectedDocIds.length} documento(s) selecionado(s)
                </p>
              )}
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-white border border-zinc-200 rounded-bl-sm shadow-sm'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Streaming message */}
          {streaming && (
            <div className="flex justify-start">
              <div className="max-w-[75%] bg-white border border-zinc-200 rounded-2xl rounded-bl-sm shadow-sm px-4 py-3">
                {streamingContent ? (
                  <div className="markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingContent}</ReactMarkdown>
                    <span className="typing-cursor" />
                  </div>
                ) : (
                  <div className="flex items-center gap-1 py-1">
                    <span className="loading-dot" />
                    <span className="loading-dot" />
                    <span className="loading-dot" />
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center">
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-4 py-2">
                ⚠️ {error}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="bg-white border-t border-zinc-200 p-4 flex-shrink-0">
          <div className="max-w-4xl mx-auto flex gap-3 items-end">
            <div className="flex-1 border border-zinc-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={`Pergunte ao ${agent.name}...`}
                rows={1}
                disabled={streaming}
                className="w-full px-4 py-3 text-sm resize-none outline-none bg-white placeholder:text-zinc-400 disabled:opacity-50"
                style={{ minHeight: '44px', maxHeight: '200px' }}
              />
            </div>
            <Button
              onClick={handleSend}
              disabled={!input.trim() || streaming}
              className="h-11 w-11 p-0 flex-shrink-0"
            >
              {streaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-center text-xs text-zinc-400 mt-2">
            Enter para enviar · Shift+Enter para nova linha
          </p>
        </div>
      </div>
    </div>
  );
}
