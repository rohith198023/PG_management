import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceContext } from '@/lib/workspace-context';
import { hashPassword } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().min(10).optional(),
  role: z.enum(['MANAGER', 'STAFF', 'WORKSPACE_ADMIN']).optional(),
  isActive: z.boolean().optional(),
  newPassword: z.string().min(6).optional(),
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
    const user = await prisma.user.findFirst({
      where: {
        id: params.id,
        workspace_id: ctx.workspaceId,
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        role: true,
        is_active: true,
        created_at: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch user' }, { status: 500 });
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
    const validated = updateUserSchema.parse(body);

    const user = await prisma.user.findFirst({
      where: { id: params.id, workspace_id: ctx.workspaceId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updates: any = {};
    if (validated.firstName) updates.first_name = validated.firstName;
    if (validated.lastName) updates.last_name = validated.lastName;
    if (validated.phone) updates.phone = validated.phone;
    if (validated.role) updates.role = validated.role;
    if (validated.isActive !== undefined) updates.is_active = validated.isActive;
    if (validated.newPassword) updates.password_hash = await hashPassword(validated.newPassword);

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: updates,
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        role: true,
        is_active: true,
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to update user' }, { status: 500 });
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

  // Prevent self-deletion
  if (params.id === ctx.userId) {
    return NextResponse.json({ error: 'Cannot deactivate or delete your own account' }, { status: 400 });
  }

  try {
    await prisma.user.update({
      where: { id: params.id },
      data: { is_active: false, deleted_at: new Date() },
    });

    return NextResponse.json({ success: true, message: 'User deactivated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete user' }, { status: 500 });
  }
}
