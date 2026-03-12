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
    await fetch('/api/admin/settings', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    setSaving(false); setAnthropicKey(''); setOpenaiKey(''); fetchSettings();
  };

  const handleTest = async (provider: 'anthropic' | 'openai') => {
    setTesting(provider);
    setTestResults((prev) => ({ ...prev, [provider]: { success: false, message: 'Testando...' } }));
    const res = await fetch('/api/admin/settings/test', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ provider }) });
    const data = await res.json();
    setTestResults((prev) => ({ ...prev, [provider]: data }));
    setTesting(null);
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie as API keys para os provedores de IA</p>
      </div>

      <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-sm">
        {/* Anthropic section */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20">
                <Key className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Anthropic (Claude)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Agentes configurados como "anthropic"</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasAnthropicKey && (
                <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />Ativa
                </span>
              )}
              <Button variant="outline" size="sm" onClick={() => handleTest('anthropic')} disabled={!hasAnthropicKey || testing === 'anthropic'}>
                {testing === 'anthropic' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                Testar
              </Button>
            </div>
          </div>

          {testResults.anthropic && (
            <div className={`text-xs p-3 rounded-xl flex items-center gap-2 ${testResults.anthropic.success
              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400'
              : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
              {testResults.anthropic.success ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {testResults.anthropic.message}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">{hasAnthropicKey ? 'Substituir API Key' : 'API Key *'}</Label>
            <div className="relative">
              <Input type={showAnthropicKey ? 'text' : 'password'} value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder={hasAnthropicKey ? '••••••••••••••••• (já configurada)' : 'sk-ant-...'}
                className="pr-10 font-mono text-xs" />
              <button type="button" onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showAnthropicKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground/60">
              Obtenha em{' '}
              <a href="https://console.anthropic.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-secondary transition-colors underline underline-offset-2">
                console.anthropic.com/api-keys
              </a>
            </p>
          </div>
        </div>

        <div className="h-px bg-border/50" />

        {/* OpenAI section */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                <Key className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">OpenAI (ChatGPT)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Opcional — necessário apenas para agentes GPT</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasOpenAIKey && (
                <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />Ativa
                </span>
              )}
              <Button variant="outline" size="sm" onClick={() => handleTest('openai')} disabled={!hasOpenAIKey || testing === 'openai'}>
                {testing === 'openai' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                Testar
              </Button>
            </div>
          </div>

          {testResults.openai && (
            <div className={`text-xs p-3 rounded-xl flex items-center gap-2 ${testResults.openai.success
              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400'
              : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
              {testResults.openai.success ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {testResults.openai.message}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">{hasOpenAIKey ? 'Substituir API Key' : 'API Key'}</Label>
            <div className="relative">
              <Input type={showOpenAIKey ? 'text' : 'password'} value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder={hasOpenAIKey ? '••••••••••••••••• (já configurada)' : 'sk-...'}
                className="pr-10 font-mono text-xs" />
              <button type="button" onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showOpenAIKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground/60">
              Obtenha em{' '}
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-secondary transition-colors underline underline-offset-2">
                platform.openai.com/api-keys
              </a>
            </p>
          </div>
        </div>

        <div className="px-6 py-4 bg-muted/20 border-t border-border/50 flex items-center justify-between">
          <p className="text-xs text-muted-foreground/60">
            API keys armazenadas com criptografia AES no banco de dados.
          </p>
          <Button onClick={handleSave} disabled={saving || (!anthropicKey && !openaiKey)}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Salvar API Keys
          </Button>
        </div>
      </div>
    </div>
  );
}
