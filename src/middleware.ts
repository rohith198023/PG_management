import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyAccessToken } from '@/lib/auth'

// Public routes that do not require authentication
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/login',
  '/register',
  '/',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if path is public
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith('/_next') || pathname.includes('.'))) {
    return NextResponse.next()
  }

  // Get authorization header or cookie
  const authHeader = request.headers.get('Authorization')
  let token: string | null = null

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7)
  } else {
    token = request.cookies.get('access_token')?.value || null
  }

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const payload = verifyAccessToken(token)
  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or expired token' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Server-side RBAC restriction: Workspace settings gateway config is WORKSPACE_ADMIN only
  if (pathname.startsWith('/api/workspace/gateway') && payload.role !== 'WORKSPACE_ADMIN' && payload.role !== 'PLATFORM_SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 })
  }

  // Clone request headers and inject extracted workspace context
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', payload.userId)
  requestHeaders.set('x-workspace-id', payload.workspaceId)
  requestHeaders.set('x-user-role', payload.role)
  requestHeaders.set('x-user-email', payload.email)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
