'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff, Loader2, CheckCircle, XCircle, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AdminSettingsPage() {
  const [hasAnthropicKey, setHasAnthropicKey] = useState(false);
  const [hasOpenAIKey, setHasOpenAIKey] = useState(false);
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<'anthropic' | 'openai' | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    const res = await fetch('/api/admin/settings');
    const data = await res.json();
    setHasAnthropicKey(data.hasAnthropicKey);
    setHasOpenAIKey(data.hasOpenAIKey);
  };

  const handleSave = async () => {
    setSaving(true);
    const body: Record<string, string> = {};
    if (anthropicKey) body.anthropicApiKey = anthropicKey;
    if (openaiKey) body.openaiApiKey = openaiKey;

    await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    setSaving(false);
    setAnthropicKey('');
    setOpenaiKey('');
    fetchSettings();
  };

  const handleTest = async (provider: 'anthropic' | 'openai') => {
    setTesting(provider);
    setTestResults((prev) => ({ ...prev, [provider]: { success: false, message: 'Testando...' } }));
    const res = await fetch('/api/admin/settings/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    });
    const data = await res.json();
    setTestResults((prev) => ({ ...prev, [provider]: data }));
    setTesting(null);
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-900">Configurações</h1>
        <p className="text-zinc-500 text-sm">Gerencie as API keys para os provedores de IA</p>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 space-y-6">
        {/* Anthropic */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <Key className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h3 className="font-medium text-zinc-900">Anthropic (Claude)</h3>
                <p className="text-xs text-zinc-500">Usado pelos agentes configurados como "anthropic"</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasAnthropicKey && (
                <span className="flex items-center gap-1 text-xs text-emerald-600">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Configurada
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTest('anthropic')}
                disabled={!hasAnthropicKey || testing === 'anthropic'}
              >
                {testing === 'anthropic' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                ) : null}
                Testar
              </Button>
            </div>
          </div>

          {testResults.anthropic && (
            <div className={`text-xs p-2.5 rounded-lg flex items-center gap-2 ${
              testResults.anthropic.success
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {testResults.anthropic.success
                ? <CheckCircle className="w-3.5 h-3.5" />
                : <XCircle className="w-3.5 h-3.5" />}
              {testResults.anthropic.message}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>{hasAnthropicKey ? 'Substituir API Key' : 'API Key *'}</Label>
            <div className="relative">
              <Input
                type={showAnthropicKey ? 'text' : 'password'}
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder={hasAnthropicKey ? '••••••••••••••••••• (já configurada)' : 'sk-ant-...'}
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                {showAnthropicKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-zinc-400">
              Obtenha em{' '}
              <a href="https://console.anthropic.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">
                console.anthropic.com/api-keys
              </a>
            </p>
          </div>
        </div>

        <hr className="border-zinc-100" />

        {/* OpenAI */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Key className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-medium text-zinc-900">OpenAI (ChatGPT)</h3>
                <p className="text-xs text-zinc-500">Opcional — necessário apenas se usar agentes GPT</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasOpenAIKey && (
                <span className="flex items-center gap-1 text-xs text-emerald-600">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Configurada
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTest('openai')}
                disabled={!hasOpenAIKey || testing === 'openai'}
              >
                {testing === 'openai' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                ) : null}
                Testar
              </Button>
            </div>
          </div>

          {testResults.openai && (
            <div className={`text-xs p-2.5 rounded-lg flex items-center gap-2 ${
              testResults.openai.success
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {testResults.openai.success
                ? <CheckCircle className="w-3.5 h-3.5" />
                : <XCircle className="w-3.5 h-3.5" />}
              {testResults.openai.message}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>{hasOpenAIKey ? 'Substituir API Key' : 'API Key'}</Label>
            <div className="relative">
              <Input
                type={showOpenAIKey ? 'text' : 'password'}
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder={hasOpenAIKey ? '••••••••••••••••••• (já configurada)' : 'sk-...'}
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                {showOpenAIKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-zinc-400">
              Obtenha em{' '}
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">
                platform.openai.com/api-keys
              </a>
            </p>
          </div>
        </div>

        <div className="pt-2">
          <Button onClick={handleSave} disabled={saving || (!anthropicKey && !openaiKey)}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Salvar API Keys
          </Button>
          <p className="text-xs text-zinc-400 mt-2">
            As API keys são armazenadas criptografadas no banco de dados.
          </p>
        </div>
      </div>
    </div>
  );
}
