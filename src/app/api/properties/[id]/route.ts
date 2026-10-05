import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceContext } from '@/lib/workspace-context';
import { z } from 'zod';

const updatePropertySchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().min(5).optional(),
  amenities: z.array(z.string()).optional(),
  rules: z.string().nullable().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await resolveWorkspaceContext(request);
  if (!ctx.workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const property = await prisma.property.findFirst({
      where: {
        id: params.id,
        workspace_id: ctx.workspaceId,
        deleted_at: null,
      },
      include: {
        floors: {
          include: {
            rooms: {
              include: {
                beds: {
                  include: {
                    tenants: {
                      include: {
                        user: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    return NextResponse.json({ property });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch property' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await resolveWorkspaceContext(request);
  if (!ctx.workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (ctx.role !== 'WORKSPACE_ADMIN' && ctx.role !== 'PLATFORM_SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validated = updatePropertySchema.parse(body);

    const property = await prisma.property.findFirst({
      where: { id: params.id, workspace_id: ctx.workspaceId },
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const updated = await prisma.property.update({
      where: { id: params.id },
      data: validated,
    });

    return NextResponse.json({ success: true, property: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to update property' }, { status: 500 });
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
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    // Check if any occupied beds exist in this property
    const occupiedBedCount = await prisma.bed.count({
      where: {
        property_id: params.id,
        workspace_id: ctx.workspaceId,
        status: 'OCCUPIED',
        deleted_at: null,
      },
    });

    if (occupiedBedCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete property with ${occupiedBedCount} currently occupied bed(s). Perform move-outs first.` },
        { status: 400 }
      );
    }

    // Soft delete property and cascade soft delete to its beds
    const now = new Date();
    await prisma.$transaction([
      prisma.property.update({
        where: { id: params.id },
        data: { deleted_at: now },
      }),
      prisma.bed.updateMany({
        where: { property_id: params.id },
        data: { deleted_at: now },
      }),
    ]);

    return NextResponse.json({ success: true, message: 'Property archived safely' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete property' }, { status: 500 });
  }
}
