import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceContext } from '@/lib/workspace-context';
import { processNotificationQueue } from '@/lib/notifications/queue';

export async function GET(request: Request) {
  try {
    const authCtx = await resolveWorkspaceContext(request);
    if (!authCtx.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized: Missing workspace context' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const channel = searchParams.get('channel');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: any = {
      workspace_id: authCtx.workspaceId,
    };

    if (status) where.status = status;
    if (channel) where.channel = channel;
    if (type) where.type = type;

    const [items, stats] = await Promise.all([
      (prisma as any).notificationQueue.findMany({
        where,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          recipient: {
            select: { id: true, first_name: true, last_name: true, email: true },
          },
        },
      }),
      (prisma as any).notificationQueue.groupBy({
        by: ['status'],
        where: { workspace_id: authCtx.workspaceId },
        _count: { id: true },
      }),
    ]);

    const statsMap: Record<string, number> = {
      PENDING: 0,
      PROCESSING: 0,
      SENT: 0,
      FAILED: 0,
      CANCELLED: 0,
    };

    stats.forEach((s: any) => {
      statsMap[s.status] = s._count.id;
    });

    return NextResponse.json({
      notifications: items,
      stats: statsMap,
    });
  } catch (error: any) {
    console.error('Failed to fetch notification queue:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authCtx = await resolveWorkspaceContext(request);
    if (!authCtx.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized: Missing workspace context' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const batchSize = body.batchSize || 20;

    const result = await processNotificationQueue(authCtx.workspaceId, batchSize);

    return NextResponse.json({
      success: true,
      summary: result,
    });
  } catch (error: any) {
    console.error('Failed to process notification queue:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
