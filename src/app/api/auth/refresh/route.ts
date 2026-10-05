import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyRefreshToken, signAccessToken, signRefreshToken } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    let refreshToken: string | null = null

    // 1. Check JSON body
    try {
      const body = await request.json()
      if (body?.refreshToken) {
        refreshToken = body.refreshToken
      }
    } catch {
      // Body might be empty if reading from cookie
    }

    // 2. Check Cookie if not in body
    if (!refreshToken) {
      const cookieHeader = request.headers.get('cookie')
      if (cookieHeader) {
        const match = cookieHeader.match(/refresh_token=([^;]+)/)
        if (match) refreshToken = match[1]
      }
    }

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token is required' }, { status: 400 })
    }

    // 3. Verify Refresh Token
    const payload = verifyRefreshToken(refreshToken)
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 })
    }

    // 4. Verify user in database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { workspace: true },
    })

    if (!user || !user.is_active || user.deleted_at) {
      return NextResponse.json({ error: 'User account is inactive or not found' }, { status: 401 })
    }

    const newPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      workspaceId: user.workspace_id,
    }

    const newAccessToken = signAccessToken(newPayload)
    const newRefreshToken = signRefreshToken(newPayload)

    const response = NextResponse.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      },
      workspace: {
        id: user.workspace.id,
        name: user.workspace.name,
        slug: user.workspace.slug,
      },
    })

    response.cookies.set('access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400, // 1 day
      path: '/',
    })

    response.cookies.set('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 86400, // 7 days
      path: '/',
    })

    return response
  } catch (error: any) {
    console.error('Token refresh error:', error)
    return NextResponse.json({ error: 'Internal server error during token refresh' }, { status: 500 })
  }
}
