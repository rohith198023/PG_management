import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';
import { signAccessToken } from '@/lib/auth';

/**
 * DEV ONLY: Promote the currently logged-in user to WORKSPACE_ADMIN
 * and immediately issue a fresh JWT cookie — no logout/login required.
 *
 * Hit: POST /api/dev/make-admin
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const auth = await requireAuth(req);
    if ('response' in auth) return auth.response;

    const { userId, workspaceId } = auth.session;

    // Update role in DB
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: 'WORKSPACE_ADMIN' },
      select: { id: true, email: true, first_name: true, last_name: true, role: true },
    });

    // Issue a brand-new JWT with WORKSPACE_ADMIN role — no re-login needed
    const newToken = signAccessToken({
      userId: updatedUser.id,
      email: updatedUser.email,
      role: 'WORKSPACE_ADMIN',
      workspaceId,
    });

    const response = NextResponse.json({
      success: true,
      message: `✅ ${updatedUser.first_name} ${updatedUser.last_name} promoted to WORKSPACE_ADMIN!`,
      newToken,
    });

    // Overwrite the existing cookie with the new token
    response.cookies.set('access_token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('make-admin error:', error);
    return NextResponse.json({ error: error.message || 'Failed to promote user' }, { status: 500 });
  }
}
