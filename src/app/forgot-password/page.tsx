'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Brain, Loader2, ArrowLeft, Mail } from 'lucide-react';
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/[0.06] rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl mb-5 shadow-[0_0_40px_rgba(23,105,104,0.35)]">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">BrandMind</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">Plataforma de Branding com IA</p>
        </div>

        <div className="bg-card border border-border/60 rounded-2xl p-7 shadow-[0_32px_80px_rgba(0,0,0,0.15)] dark:shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
          {sent ? (
            <div className="text-center py-2">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-2xl mb-4 border border-primary/20">
                <Mail className="w-6 h-6 text-secondary" />
              </div>
              <h2 className="text-base font-semibold text-foreground mb-2">E-mail enviado!</h2>
              <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                Se esse e-mail estiver cadastrado, você receberá um link em alguns minutos.
                Verifique também a caixa de spam.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-accent hover:text-secondary font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para o login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-base font-semibold text-foreground mb-1.5">Recuperar senha</h2>
              <p className="text-muted-foreground text-sm mb-5">
                Digite seu e-mail e enviaremos um link para redefinir sua senha.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-muted-foreground text-xs font-medium">E-mail</Label>
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
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
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
