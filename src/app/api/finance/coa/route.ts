import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';
import { z } from 'zod';
import { initializeWorkspaceLedgerAccounts } from '@/lib/ledger/coa';

const coaSchema = z.object({
  code: z.string().min(4, 'Account code must be at least 4 digits'),
  name: z.string().min(2, 'Account name is required'),
  type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
});

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;

    const workspaceId = auth.session.workspaceId;
    await initializeWorkspaceLedgerAccounts(workspaceId);

    const accounts = await prisma.ledgerAccount.findMany({
      where: { workspace_id: workspaceId },
      include: {
        journal_entries: true,
      },
      orderBy: { code: 'asc' },
    });

    const accountsWithBalance = accounts.map((acc) => {
      const totalDebit = acc.journal_entries.reduce((sum, e) => sum + Number(e.debit_amount), 0);
      const totalCredit = acc.journal_entries.reduce((sum, e) => sum + Number(e.credit_amount), 0);
      const balance = acc.type === 'ASSET' || acc.type === 'EXPENSE' ? totalDebit - totalCredit : totalCredit - totalDebit;

      return {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        totalDebit,
        totalCredit,
        balance,
        entriesCount: acc.journal_entries.length,
      };
    });

    return NextResponse.json({ accounts: accountsWithBalance });
  } catch (error: any) {
    console.error('Fetch COA Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch Chart of Accounts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;

    if (auth.session.role !== 'WORKSPACE_ADMIN' && auth.session.role !== 'PLATFORM_SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required to edit Chart of Accounts' }, { status: 403 });
    }

    const workspaceId = auth.session.workspaceId;
    const body = await req.json();
    const { code, name, type } = coaSchema.parse(body);

    const account = await prisma.ledgerAccount.create({
      data: {
        workspace_id: workspaceId,
        code,
        name,
        type,
      },
    });

    return NextResponse.json({ message: 'Ledger account created successfully!', account });
  } catch (error: any) {
    console.error('Create Account Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create ledger account' }, { status: 500 });
  }
}
