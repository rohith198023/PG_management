import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { getProfitAndLossStatement } from '@/lib/ledger/reports';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;

    const workspaceId = auth.session.workspaceId;
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const pnl = await getProfitAndLossStatement(workspaceId, startDate, endDate);

    return NextResponse.json({
      reportName: 'Income Statement (Profit & Loss)',
      generatedAt: new Date().toISOString(),
      dateRange: { startDate, endDate },
      statement: pnl,
    });
  } catch (error: any) {
    console.error('Fetch P&L Report Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate Profit & Loss statement' }, { status: 500 });
  }
}
