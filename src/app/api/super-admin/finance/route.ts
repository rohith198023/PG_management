import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;

    if (auth.session.role !== 'PLATFORM_SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super-Admin access required' }, { status: 403 });
    }

    const totalWorkspaces = await prisma.workspace.count();

    const globalGatewayHealths = await prisma.gatewayHealth.findMany({
      take: 20,
      orderBy: { updated_at: 'desc' },
      include: {
        workspace: {
          select: { name: true },
        },
      },
    });

    const failedWebhooksCount = await prisma.webhookEvent.count({
      where: { status: 'FAILED' },
    });

    const totalFraudFlagsCount = await prisma.fraudCheck.count({
      where: { is_flagged: true },
    });

    return NextResponse.json({
      superAdminMetrics: {
        totalWorkspaces,
        failedWebhooksCount,
        totalFraudFlagsCount,
      },
      globalGatewayHealths,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch super-admin telemetry' }, { status: 500 });
  }
}
