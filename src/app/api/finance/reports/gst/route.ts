import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;

    const workspaceId = auth.session.workspaceId;

    const finSettings = await prisma.financialSettings.findUnique({
      where: { workspace_id: workspaceId },
    });

    const cgstRate = Number(finSettings?.cgst_rate || 0);
    const sgstRate = Number(finSettings?.sgst_rate || 0);
    const igstRate = Number(finSettings?.igst_rate || 0);
    const totalGstRate = cgstRate + sgstRate + igstRate;

    // Fetch all issued/paid invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        workspace_id: workspaceId,
        status: { in: ['ISSUED', 'PARTIALLY_PAID', 'PAID'] },
      },
      orderBy: { created_at: 'desc' },
    });

    let totalTaxableValue = 0;
    let totalCgstCollected = 0;
    let totalSgstCollected = 0;
    let totalIgstCollected = 0;

    const taxRows = (invoices || []).map((inv) => {
      const grossAmount = Number(inv.total_amount || 0);
      const taxableValue = totalGstRate > 0 ? grossAmount / (1 + totalGstRate / 100) : grossAmount;
      const taxAmount = grossAmount - taxableValue;

      const cgst = totalGstRate > 0 ? (taxAmount * cgstRate) / totalGstRate : 0;
      const sgst = totalGstRate > 0 ? (taxAmount * sgstRate) / totalGstRate : 0;
      const igst = totalGstRate > 0 ? (taxAmount * igstRate) / totalGstRate : 0;

      totalTaxableValue += taxableValue;
      totalCgstCollected += cgst;
      totalSgstCollected += sgst;
      totalIgstCollected += igst;

      return {
        invoiceNumber: inv.invoice_number,
        date: inv.created_at,
        status: inv.status,
        grossAmount,
        taxableValue: Math.round(taxableValue * 100) / 100,
        cgst: Math.round(cgst * 100) / 100,
        sgst: Math.round(sgst * 100) / 100,
        igst: Math.round(igst * 100) / 100,
        totalTax: Math.round(taxAmount * 100) / 100,
      };
    });

    return NextResponse.json({
      gstin: finSettings?.tax_gst_number || 'UNREGISTERED',
      taxRates: { cgstRate, sgstRate, igstRate, totalGstRate },
      totals: {
        totalTaxableValue: Math.round(totalTaxableValue * 100) / 100,
        totalCgstCollected: Math.round(totalCgstCollected * 100) / 100,
        totalSgstCollected: Math.round(totalSgstCollected * 100) / 100,
        totalIgstCollected: Math.round(totalIgstCollected * 100) / 100,
        totalTaxCollected: Math.round((totalCgstCollected + totalSgstCollected + totalIgstCollected) * 100) / 100,
      },
      rows: taxRows,
    });
  } catch (error: any) {
    console.error('Fetch GST Report Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate GST tax report' }, { status: 500 });
  }
}
