import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceContext } from '@/lib/workspace-context';
import { z } from 'zod';

const updateTenantSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().min(10).optional(),
  emergencyContact: z.string().optional(),
  isActive: z.boolean().optional(),
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
    const isMe = params.id === 'me';
    const tenant = await prisma.tenantProfile.findFirst({
      where: isMe
        ? {
            user_id: ctx.userId,
            workspace_id: ctx.workspaceId,
            deleted_at: null,
          }
        : {
            id: params.id,
            workspace_id: ctx.workspaceId,
            deleted_at: null,
          },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            phone: true,
            is_active: true,
            created_at: true,
          },
        },
        bed: {
          include: {
            room: {
              include: {
                property: true,
              },
            },
          },
        },
        leases: {
          orderBy: { created_at: 'desc' },
        },
        invoices: {
          orderBy: { issue_date: 'desc' },
          take: 10,
        },
        payments: {
          orderBy: { payment_date: 'desc' },
          take: 10,
        },
        complaints: {
          orderBy: { created_at: 'desc' },
          take: 5,
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json({ tenant });
  } catch (error: any) {
    console.error('GET Tenant Detail Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch tenant' }, { status: 500 });
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

  try {
    const body = await request.json();
    const validated = updateTenantSchema.parse(body);

    const tenant = await prisma.tenantProfile.findFirst({
      where: { id: params.id, workspace_id: ctx.workspaceId },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Update User table fields if present
    const userUpdates: any = {};
    if (validated.firstName) userUpdates.first_name = validated.firstName;
    if (validated.lastName) userUpdates.last_name = validated.lastName;
    if (validated.phone) userUpdates.phone = validated.phone;
    if (validated.isActive !== undefined) userUpdates.is_active = validated.isActive;

    if (Object.keys(userUpdates).length > 0) {
      await prisma.user.update({
        where: { id: tenant.user_id },
        data: userUpdates,
      });
    }

    // Update TenantProfile fields if present
    if (validated.emergencyContact !== undefined) {
      await prisma.tenantProfile.update({
        where: { id: tenant.id },
        data: { emergency_contact: validated.emergencyContact },
      });
    }

    return NextResponse.json({ success: true, message: 'Tenant updated successfully' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('PATCH Tenant Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update tenant' }, { status: 500 });
  }
}
