import type { Metadata } from 'next';
import './globals.css';
import { SessionProvider } from '@/components/providers/session-provider';

export const metadata: Metadata = {
  title: 'BrandMind — Plataforma de Branding com IA',
  description: 'Plataforma de branding com agentes de IA para estrategistas',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased bg-zinc-50">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
