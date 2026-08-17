import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;

    const workspaceId = auth.session.workspaceId;
    const paymentId = params.id;

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, workspace_id: workspaceId },
      include: {
        invoice: {
          include: {
            tenant: {
              include: { user: true },
            },
          },
        },
        receipt: true,
        workspace: true,
        proof: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment or receipt not found' }, { status: 404 });
    }

    const receiptData = {
      receiptNumber: payment.receipt?.receipt_number || `REC-${payment.id.substring(0, 8).toUpperCase()}`,
      issuedAt: payment.receipt?.issued_at || payment.payment_date,
      workspaceName: payment.workspace.name,
      gstNumber: payment.workspace.gst_number || 'N/A',
      tenantName: `${payment.invoice.tenant.user.first_name} ${payment.invoice.tenant.user.last_name}`,
      invoiceNumber: payment.invoice.invoice_number,
      amountPaid: payment.amount,
      paymentMethod: payment.source,
      transactionRef: payment.transaction_ref || payment.proof?.utr_number || 'N/A',
      status: payment.status,
    };

    return NextResponse.json({ receipt: receiptData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch receipt' }, { status: 500 });
  }
}
