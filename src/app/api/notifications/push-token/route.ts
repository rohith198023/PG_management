import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';
import { z } from 'zod';

const pushTokenSchema = z.object({
  token: z.string().min(1, 'Push token is required'),
  platform: z.enum(['ios', 'android', 'web']).optional().default('android'),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ('response' in auth) return auth.response;

    const workspaceId = auth.session.workspaceId;
    const userId = auth.session.userId;
    const body = await request.json();
    const { token, platform } = pushTokenSchema.parse(body);

    // Record or update registration audit log
    await prisma.auditLog.create({
      data: {
        workspace_id: workspaceId,
        action: 'PUSH_TOKEN_REGISTERED',
        entity: 'User',
        entity_id: userId,
        details: {
          pushToken: token,
          platform,
          registeredAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Push notification token registered successfully',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to register push token' }, { status: 500 });
  }
}
