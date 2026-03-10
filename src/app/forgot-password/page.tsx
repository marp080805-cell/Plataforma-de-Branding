'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Zap, Loader2, ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao enviar e-mail. Tente novamente.');
      }
    } catch {
      setError('Erro ao enviar e-mail. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080810] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#7c6ef5]/[0.06] rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#7c6ef5] rounded-2xl mb-5 shadow-[0_0_40px_rgba(124,110,245,0.35)]">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-[#e8e8f4] tracking-tight">BrandMind</h1>
          <p className="text-[#60607a] mt-1.5 text-sm">Plataforma de Branding com IA</p>
        </div>

        <div className="bg-[#0f0f18] border border-white/[0.08] rounded-2xl p-7 shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
          {sent ? (
            <div className="text-center py-2">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[#7c6ef5]/[0.12] rounded-2xl mb-4 border border-[#7c6ef5]/[0.2]">
                <Mail className="w-6 h-6 text-[#a898ff]" />
              </div>
              <h2 className="text-base font-semibold text-[#d8d8f0] mb-2">E-mail enviado!</h2>
              <p className="text-[#70709a] text-sm mb-6 leading-relaxed">
                Se esse e-mail estiver cadastrado, você receberá um link em alguns minutos.
                Verifique também a caixa de spam.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-[#9d90ff] hover:text-[#b4aaff] font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para o login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-base font-semibold text-[#d8d8f0] mb-1.5">Recuperar senha</h2>
              <p className="text-[#606080] text-sm mb-5">
                Digite seu e-mail e enviaremos um link para redefinir sua senha.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-[#c93030]/[0.12] border border-[#c93030]/[0.2] rounded-xl text-[#ff8080] text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-[#8080a0] text-xs font-medium">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar link de recuperação'
                  )}
                </Button>
              </form>

              <div className="mt-5 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-[#606080] hover:text-[#9090b0] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar para o login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
