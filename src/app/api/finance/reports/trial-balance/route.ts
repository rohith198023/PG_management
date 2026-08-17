import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { getTrialBalanceStatement } from '@/lib/ledger/reports';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;

    const workspaceId = auth.session.workspaceId;
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const trialBalance = await getTrialBalanceStatement(workspaceId, startDate, endDate);

    return NextResponse.json({
      reportName: 'Trial Balance Statement',
      generatedAt: new Date().toISOString(),
      dateRange: { startDate, endDate },
      statement: trialBalance,
    });
  } catch (error: any) {
    console.error('Fetch Trial Balance Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate Trial Balance statement' }, { status: 500 });
  }
}
