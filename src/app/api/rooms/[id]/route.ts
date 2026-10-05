import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceContext } from '@/lib/workspace-context';
import { z } from 'zod';

const updateRoomSchema = z.object({
  roomNumber: z.string().min(1).optional(),
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
    const validated = updateRoomSchema.parse(body);

    const room = await prisma.room.findFirst({
      where: { id: params.id, workspace_id: ctx.workspaceId },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const updated = await prisma.room.update({
      where: { id: params.id },
      data: {
        ...(validated.roomNumber ? { room_number: validated.roomNumber } : {}),
      },
    });

    return NextResponse.json({ success: true, room: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update room' }, { status: 500 });
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
    const occupiedCount = await prisma.bed.count({
      where: {
        room_id: params.id,
        workspace_id: ctx.workspaceId,
        status: 'OCCUPIED',
        deleted_at: null,
      },
    });

    if (occupiedCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete room with ${occupiedCount} currently occupied bed(s).` },
        { status: 400 }
      );
    }

    // Delete beds in this room and room
    await prisma.$transaction([
      prisma.bed.deleteMany({ where: { room_id: params.id } }),
      prisma.room.delete({ where: { id: params.id } }),
    ]);

    return NextResponse.json({ success: true, message: 'Room deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete room' }, { status: 500 });
  }
}
