// CommonJS seed — roda com `node prisma/seed.js` sem precisar de tsx/ts-node
'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@brandforge.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@brandforge.com',
      password: adminPassword,
      role: 'admin',
      avatarColor: '#6366f1',
    },
  });
  console.log('✅ Admin user:', admin.email);

  // Settings
  await prisma.settings.upsert({
    where: { id: 'global' },
    update: {},
    create: { id: 'global' },
  });
  console.log('✅ Settings initialized');

  // Agents
  const agents = [
    {
      name: 'Estrategista de Branding',
      description: 'Desenvolve o posicionamento estratégico da marca, define propósito, visão, missão, valores e personalidade.',
      icon: 'brain',
      systemPrompt: `Você é um estrategista de branding sênior com mais de 15 anos de experiência. Sua função é analisar os documentos da marca fornecidos e desenvolver o posicionamento estratégico completo. Seja profundo, analítico e criativo. Sempre baseie suas recomendações nos documentos fornecidos. Estruture suas respostas de forma clara e organizada.`,
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      temperature: 0.7,
      maxTokens: 4096,
      sortOrder: 0,
    },
    {
      name: 'Plataforma de Marca / Playbook',
      description: 'Cria o playbook completo da marca: tom de voz, diretrizes de comunicação, arquétipos e brand persona.',
      icon: 'book-open',
      systemPrompt: `Você é um especialista em plataforma de marca e branding. Sua função é criar o playbook completo da marca, incluindo tom de voz, diretrizes de comunicação, arquétipos, brand persona e guia de linguagem. Use os documentos fornecidos como base. Seja detalhado e prático nas diretrizes.`,
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      temperature: 0.5,
      maxTokens: 4096,
      sortOrder: 1,
    },
    {
      name: 'Pesquisa de Mercado',
      description: 'Realiza análises de mercado, benchmarking, análise de concorrentes e mapeamento de tendências.',
      icon: 'search',
      systemPrompt: `Você é um analista de mercado especializado em branding e posicionamento. Sua função é realizar pesquisas e análises usando os documentos fornecidos como base: análise de concorrentes, benchmarking, tendências do mercado, análise SWOT e oportunidades. Seja factual, use dados quando disponíveis e organize as análises de forma clara.`,
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      temperature: 0.6,
      maxTokens: 4096,
      sortOrder: 2,
    },
  ];

  for (const agentData of agents) {
    const existing = await prisma.agent.findFirst({ where: { name: agentData.name } });
    if (!existing) {
      const agent = await prisma.agent.create({ data: agentData });
      console.log('✅ Agent created:', agent.name);
    } else {
      console.log('⏭️  Agent already exists:', existing.name);
    }
  }

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
