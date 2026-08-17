import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;

    const workspaceId = auth.session.workspaceId;

    // Collections metrics
    const totalPayments = await prisma.payment.aggregate({
      where: { workspace_id: workspaceId, status: 'PAID' },
      _sum: { amount: true },
      _count: { id: true },
    });

    const pendingPayments = await prisma.payment.aggregate({
      where: { workspace_id: workspaceId, status: 'PENDING_VERIFICATION' },
      _sum: { amount: true },
      _count: { id: true },
    });

    const totalInvoices = await prisma.invoice.aggregate({
      where: { workspace_id: workspaceId, deleted_at: null },
      _sum: { total_amount: true, amount_paid: true },
      _count: { id: true },
    });

    const gatewayHealths = await prisma.gatewayHealth.findMany({
      where: { workspace_id: workspaceId },
    });

    const failoverLogs = await prisma.gatewayFailoverLog.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { created_at: 'desc' },
      take: 5,
    });

    const invoiceTotal = Number(totalInvoices._sum.total_amount || 0);
    const paidTotal = Number(totalInvoices._sum.amount_paid || 0);
    const collectionEfficiency = invoiceTotal > 0 ? ((paidTotal / invoiceTotal) * 100).toFixed(1) : '100.0';

    return NextResponse.json({
      metrics: {
        todayCollections: Number(totalPayments._sum.amount || 0),
        pendingVerificationAmount: Number(pendingPayments._sum.amount || 0),
        pendingVerificationCount: pendingPayments._count.id,
        outstandingDebt: invoiceTotal - paidTotal,
        collectionEfficiencyPct: parseFloat(collectionEfficiency),
        totalInvoicesCount: totalInvoices._count.id,
      },
      gatewayHealths,
      failoverLogs,
      queues: {
        webhookPending: 0,
        paymentPending: pendingPayments._count.id,
        deadLetterCount: 0,
        ocrQueueCount: 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch finance analytics' }, { status: 500 });
  }
}
