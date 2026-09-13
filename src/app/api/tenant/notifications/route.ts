import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceContext } from '@/lib/workspace-context';

export async function GET(request: Request) {
  try {
    const authCtx = await resolveWorkspaceContext(request);
    if (!authCtx.userId || !authCtx.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    const notifications = await (prisma as any).notificationQueue.findMany({
      where: {
        workspace_id: authCtx.workspaceId,
        recipient_id: authCtx.userId,
      },
      take: limit,
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({
      notifications,
    });
  } catch (error: any) {
    console.error('Failed to fetch tenant notifications:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
