import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';
import { z } from 'zod';
// BankAccountType enum does not exist in schema — using string literal validation

const bankAccountSchema = z.object({
  bankName: z.string().min(2),
  accountNumber: z.string().min(6),
  ifscCode: z.string().min(4),
  accountType: z.enum(['RENT_COLLECTION', 'EXPENSE_PAYMENT', 'SAVINGS', 'CURRENT', 'OTHER']).default('RENT_COLLECTION'),
  isDefault: z.boolean().default(false),
});

const finSettingsSchema = z.object({
  invoicePrefix: z.string().default('INV'),
  dueDays: z.number().default(7),
  taxGstNumber: z.string().optional(),
  cgstRate: z.number().default(0),
  sgstRate: z.number().default(0),
  igstRate: z.number().default(0),
  lateFeePerDay: z.number().default(0),
  autoReconcileEnabled: z.boolean().default(true),
  failoverEnabled: z.boolean().default(true),
});

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;

    const workspaceId = auth.session.workspaceId;

    const settings = await prisma.financialSettings.upsert({
      where: { workspace_id: workspaceId },
      update: {},
      create: {
        workspace_id: workspaceId,
        invoice_prefix: 'INV',
        due_days: 7,
      },
    });

    const bankAccounts = await prisma.bankAccount.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ settings, bankAccounts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch financial settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;

    if (auth.session.role !== 'WORKSPACE_ADMIN' && auth.session.role !== 'PLATFORM_SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const workspaceId = auth.session.workspaceId;
    const body = await req.json();

    if (body.action === 'ADD_BANK_ACCOUNT') {
      const validated = bankAccountSchema.parse(body.bankAccount);
      const bank = await prisma.bankAccount.create({
        data: {
          workspace_id: workspaceId,
          bank_name: validated.bankName,
          account_number: validated.accountNumber,
          ifsc_code: validated.ifscCode,
          account_type: validated.accountType as any,
          is_default: validated.isDefault,
        },
      });
      return NextResponse.json({ message: 'Bank account added successfully', bank });
    }

    const validated = finSettingsSchema.parse(body);
    const updated = await prisma.financialSettings.upsert({
      where: { workspace_id: workspaceId },
      update: {
        invoice_prefix: validated.invoicePrefix,
        due_days: validated.dueDays,
        tax_gst_number: validated.taxGstNumber || null,
        cgst_rate: validated.cgstRate,
        sgst_rate: validated.sgstRate,
        igst_rate: validated.igstRate,
        late_fee_per_day: validated.lateFeePerDay,
        auto_reconcile_enabled: validated.autoReconcileEnabled,
        failover_enabled: validated.failoverEnabled,
      },
      create: {
        workspace_id: workspaceId,
        invoice_prefix: validated.invoicePrefix,
        due_days: validated.dueDays,
        tax_gst_number: validated.taxGstNumber || null,
        cgst_rate: validated.cgstRate,
        sgst_rate: validated.sgstRate,
        igst_rate: validated.igstRate,
        late_fee_per_day: validated.lateFeePerDay,
        auto_reconcile_enabled: validated.autoReconcileEnabled,
        failover_enabled: validated.failoverEnabled,
      },
    });

    return NextResponse.json({ message: 'Financial Settings updated successfully', settings: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update financial settings' }, { status: 500 });
  }
}
