import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filterUserId = searchParams.get('userId');

  const isAdmin = session.user.role === 'admin';

  const where = isAdmin && filterUserId
    ? { userId: filterUserId }
    : isAdmin
    ? {}
    : { userId: session.user.id };

  const projects = await prisma.project.findMany({
    where,
    include: {
      _count: { select: { documents: true, conversations: true } },
      ...(isAdmin ? { user: { select: { id: true, name: true, avatarColor: true } } } : {}),
    },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, description, color } = await req.json();
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const project = await prisma.project.create({
    data: {
      name,
      description,
      color: color || '#6366f1',
      userId: session.user.id,
    },
  });

  return NextResponse.json(project, { status: 201 });
}
