import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceContext } from '@/lib/workspace-context';
import { z } from 'zod';

const updateWorkspaceSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  email: z.string().email().optional(),
  gstNumber: z.string().optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  // Financial settings
  invoicePrefix: z.string().min(1).max(10).optional(),
  dueDays: z.number().int().min(1).max(30).optional(),
  lateFeePerDay: z.number().nonnegative().optional(),
  cgstRate: z.number().nonnegative().optional(),
  sgstRate: z.number().nonnegative().optional(),
});

export async function GET(request: Request) {
  const ctx = await resolveWorkspaceContext(request);
  if (!ctx.workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: ctx.workspaceId },
      include: {
        financial_settings: true,
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    return NextResponse.json({ workspace });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch workspace' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const ctx = await resolveWorkspaceContext(request);
  if (!ctx.workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (ctx.role !== 'WORKSPACE_ADMIN' && ctx.role !== 'PLATFORM_SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Only Workspace Admins can edit settings' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validated = updateWorkspaceSchema.parse(body);

    const workspaceData: any = {};
    if (validated.name) workspaceData.name = validated.name;
    if (validated.phone) workspaceData.phone = validated.phone;
    if (validated.email) workspaceData.email = validated.email;
    if (validated.gstNumber !== undefined) workspaceData.gst_number = validated.gstNumber;
    if (validated.logoUrl !== undefined) workspaceData.logo_url = validated.logoUrl;

    const [updatedWorkspace] = await prisma.$transaction([
      prisma.workspace.update({
        where: { id: ctx.workspaceId },
        data: workspaceData,
      }),
      prisma.financialSettings.upsert({
        where: { workspace_id: ctx.workspaceId },
        update: {
          ...(validated.invoicePrefix ? { invoice_prefix: validated.invoicePrefix } : {}),
          ...(validated.dueDays !== undefined ? { due_days: validated.dueDays } : {}),
          ...(validated.lateFeePerDay !== undefined ? { late_fee_per_day: validated.lateFeePerDay } : {}),
          ...(validated.cgstRate !== undefined ? { cgst_rate: validated.cgstRate } : {}),
          ...(validated.sgstRate !== undefined ? { sgst_rate: validated.sgstRate } : {}),
        },
        create: {
          workspace_id: ctx.workspaceId,
          invoice_prefix: validated.invoicePrefix || 'INV',
          due_days: validated.dueDays || 7,
          late_fee_per_day: validated.lateFeePerDay || 0,
          cgst_rate: validated.cgstRate || 0,
          sgst_rate: validated.sgstRate || 0,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Workspace settings updated successfully',
      workspace: updatedWorkspace,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to update workspace settings' }, { status: 500 });
  }
}
