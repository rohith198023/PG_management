import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceContext } from '@/lib/workspace-context';
import { BedStatus } from '@prisma/client';
import { z } from 'zod';

const updateBedSchema = z.object({
  bedNumber: z.string().min(1).optional(),
  status: z.nativeEnum(BedStatus).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await resolveWorkspaceContext(request);
  if (!ctx.workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (ctx.role !== 'WORKSPACE_ADMIN' && ctx.role !== 'PLATFORM_SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validated = updateBedSchema.parse(body);

    const bed = await prisma.bed.findFirst({
      where: { id: params.id, workspace_id: ctx.workspaceId },
    });

    if (!bed) {
      return NextResponse.json({ error: 'Bed not found' }, { status: 404 });
    }

    // Do not allow setting status to VACANT if currently occupied by a tenant
    if (validated.status === 'VACANT' && bed.status === 'OCCUPIED') {
      const activeTenant = await prisma.tenantProfile.findFirst({
        where: { bed_id: params.id, deleted_at: null },
      });
      if (activeTenant) {
        return NextResponse.json(
          { error: 'Cannot mark occupied bed as VACANT directly. Complete move-out first.' },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.bed.update({
      where: { id: params.id },
      data: {
        ...(validated.bedNumber ? { bed_number: validated.bedNumber } : {}),
        ...(validated.status ? { status: validated.status } : {}),
      },
    });

    return NextResponse.json({ success: true, bed: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update bed' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await resolveWorkspaceContext(request);
  if (!ctx.workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (ctx.role !== 'WORKSPACE_ADMIN' && ctx.role !== 'PLATFORM_SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const bed = await prisma.bed.findFirst({
      where: { id: params.id, workspace_id: ctx.workspaceId },
    });

    if (!bed) {
      return NextResponse.json({ error: 'Bed not found' }, { status: 404 });
    }

    if (bed.status === 'OCCUPIED') {
      return NextResponse.json({ error: 'Cannot delete an occupied bed' }, { status: 400 });
    }

    await prisma.bed.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true, message: 'Bed deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete bed' }, { status: 500 });
  }
}
