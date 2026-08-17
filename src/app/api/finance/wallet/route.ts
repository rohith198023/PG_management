import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;

    const workspaceId = auth.session.workspaceId;
    const userId = auth.session.userId;

    // Find tenant profile for tenant role
    const tenant = await prisma.tenantProfile.findFirst({
      where: { workspace_id: workspaceId, user_id: userId },
    });

    if (!tenant) {
      return NextResponse.json({ wallet: { balance: 0, transactions: [] } });
    }

    const wallet = await prisma.residentWallet.upsert({
      where: { tenant_id: tenant.id },
      update: {},
      create: {
        workspace_id: workspaceId,
        tenant_id: tenant.id,
        balance: 0,
      },
      include: {
        transactions: {
          orderBy: { created_at: 'desc' },
          take: 20,
        },
      },
    });

    return NextResponse.json({ wallet });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch wallet' }, { status: 500 });
  }
}
