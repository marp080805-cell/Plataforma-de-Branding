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
    <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-60' : 'w-0'
        } transition-all duration-300 overflow-hidden border-r border-white/[0.06] bg-[#0a0a12] flex-shrink-0`}
      >
        <div className="w-60 h-full flex flex-col">
          {/* Breadcrumb */}
          <div className="p-4 border-b border-white/[0.05]">
            <div className="flex items-center gap-1 text-xs text-[#404060] mb-2">
              <Link href="/dashboard" className="hover:text-[#7070a0] transition-colors">Projetos</Link>
              <ChevronRight className="w-3 h-3" />
              <Link href={`/projects/${project.id}`} className="hover:text-[#7070a0] transition-colors truncate">{project.name}</Link>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0 opacity-70" style={{ backgroundColor: project.color }} />
              <span className="text-xs font-medium text-[#9090b0] truncate">{project.name}</span>
            </div>
          </div>

          {/* Documents */}
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-[10px] font-semibold text-[#404060] uppercase tracking-widest mb-3">
              Contexto ({selectedDocIds.length}/{initialDocuments.length})
            </h3>
            {initialDocuments.length === 0 ? (
              <p className="text-xs text-[#40405a]">
                Nenhum documento.{' '}
                <Link href={`/projects/${project.id}`} className="text-[#7c6ef5] hover:text-[#9d90ff] transition-colors">
                  Adicionar
                </Link>
              </p>
            ) : (
              <div className="space-y-0.5">
                {initialDocuments.map((doc) => {
                  const selected = selectedDocIds.includes(doc.id);
                  return (
                    <label
                      key={doc.id}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all duration-150 ${
                        selected
                          ? 'bg-[#7c6ef5]/[0.1] border border-[#7c6ef5]/[0.15]'
                          : 'hover:bg-white/[0.04] border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleDoc(doc.id)}
                        className="accent-[#7c6ef5] w-3.5 h-3.5 flex-shrink-0"
                      />
                      <span className="flex-shrink-0">{getFileIcon(doc.mimeType)}</span>
                      <span
                        className={`text-xs truncate ${
                          selected ? 'text-[#a898ff] font-medium' : 'text-[#60607a]'
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
        className="absolute z-10 w-5 h-10 bg-[#0f0f1a] border border-white/[0.08] rounded-r-lg flex items-center justify-center text-[#404060] hover:text-[#8080a0] transition-all duration-300 shadow-lg"
        style={{ left: sidebarOpen ? '240px' : '0px' }}
      >
        {sidebarOpen ? (
          <ChevronLeft className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
      </button>

      {/* Chat area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#080810]">
        {/* Chat header */}
        <div className="border-b border-white/[0.06] px-6 py-3 flex items-center justify-between flex-shrink-0 bg-[#0a0a12]/60 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#7c6ef5]/[0.12] rounded-xl flex items-center justify-center text-[#9d90ff] border border-[#7c6ef5]/[0.2]">
              {getAgentIcon(agent.icon)}
            </div>
            <div>
              <h2 className="font-medium text-[#d0d0e8] text-sm">{agent.name}</h2>
              <Badge
                variant={agent.provider === 'anthropic' ? 'anthropic' : 'openai'}
              >
                {agent.provider === 'anthropic' ? 'Claude' : 'ChatGPT'}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearConversation}
            className="text-[#404060] hover:text-[#ff7070] hover:bg-[#c93030]/[0.08]"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Limpar
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-8 space-y-5">
          {messages.length === 0 && !streaming && (
            <div className="text-center py-16">
              <div className="w-14 h-14 bg-[#7c6ef5]/[0.08] rounded-2xl flex items-center justify-center text-[#9d90ff] mx-auto mb-4 border border-[#7c6ef5]/[0.15]">
                {getAgentIcon(agent.icon)}
              </div>
              <h3 className="font-medium text-[#c0c0d8] mb-1.5 text-sm">{agent.name}</h3>
              <p className="text-xs text-[#505070] max-w-xs mx-auto leading-relaxed">{agent.description}</p>
              {selectedDocIds.length > 0 && (
                <p className="text-xs text-[#7c6ef5]/80 mt-3">
                  {selectedDocIds.length} documento(s) no contexto
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
                className={`max-w-[78%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-[#7c6ef5] text-white rounded-br-md shadow-[0_0_20px_rgba(124,110,245,0.15)]'
                    : 'bg-[#0f0f1a] border border-white/[0.07] rounded-bl-md'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
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
              <div className="max-w-[78%] bg-[#0f0f1a] border border-white/[0.07] rounded-2xl rounded-bl-md px-4 py-3">
                {streamingContent ? (
                  <div className="markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingContent}</ReactMarkdown>
                    <span className="typing-cursor" />
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 py-1">
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
              <div className="bg-[#c93030]/[0.1] border border-[#c93030]/[0.2] text-[#ff8080] text-xs rounded-xl px-4 py-2">
                {error}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-white/[0.06] p-4 flex-shrink-0 bg-[#0a0a12]/40 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto flex gap-2.5 items-end">
            <div className="flex-1 border border-white/[0.09] rounded-xl overflow-hidden bg-white/[0.04] focus-within:border-[#7c6ef5]/40 focus-within:bg-[#7c6ef5]/[0.04] transition-all duration-200">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={`Pergunte ao ${agent.name}...`}
                rows={1}
                disabled={streaming}
                className="w-full px-4 py-3 text-sm resize-none outline-none bg-transparent text-[#d0d0e8] placeholder:text-[#3a3a54] disabled:opacity-40"
                style={{ minHeight: '44px', maxHeight: '200px' }}
              />
            </div>
            <Button
              onClick={handleSend}
              disabled={!input.trim() || streaming}
              className="h-11 w-11 p-0 flex-shrink-0 rounded-xl"
            >
              {streaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-center text-[10px] text-[#30304a] mt-2">
            Enter para enviar · Shift+Enter para nova linha
          </p>
        </div>
      </div>
    </div>
  );
}
