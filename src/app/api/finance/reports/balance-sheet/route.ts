import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { getBalanceSheetStatement } from '@/lib/ledger/reports';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;

    const workspaceId = auth.session.workspaceId;
    const { searchParams } = new URL(req.url);
    const endDate = searchParams.get('endDate') || undefined;

    const balanceSheet = await getBalanceSheetStatement(workspaceId, endDate);

    return NextResponse.json({
      reportName: 'Balance Sheet Statement',
      generatedAt: new Date().toISOString(),
      asOfDate: endDate || new Date().toISOString().split('T')[0],
      statement: balanceSheet,
    });
  } catch (error: any) {
    console.error('Fetch Balance Sheet Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate Balance Sheet statement' }, { status: 500 });
  }
}
