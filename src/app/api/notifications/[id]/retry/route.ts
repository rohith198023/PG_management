import { NextResponse } from 'next/server';
import { resolveWorkspaceContext } from '@/lib/workspace-context';
import { retryNotification } from '@/lib/notifications/queue';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authCtx = await resolveWorkspaceContext(request);
    if (!authCtx.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized: Missing workspace context' }, { status: 401 });
    }

    const { id } = params;
    const updated = await retryNotification(id, authCtx.workspaceId);

    return NextResponse.json({
      success: true,
      notification: updated,
    });
  } catch (error: any) {
    console.error('Failed to retry notification:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
