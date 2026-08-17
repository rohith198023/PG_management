import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;

    const workspaceId = auth.session.workspaceId;
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q') || '';

    const audits = await prisma.paymentAudit.findMany({
      where: {
        workspace_id: workspaceId,
        ...(search
          ? {
              OR: [
                { action: { contains: search, mode: 'insensitive' } },
                { correlation_id: { contains: search, mode: 'insensitive' } },
                { ip_address: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    return NextResponse.json({ audits });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch financial audits' }, { status: 500 });
  }
}
