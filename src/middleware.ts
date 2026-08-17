import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-jwt-token-key-change-this-in-production-32chars'
)

// Public routes that do not require authentication
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/dev',
  '/login',
  '/register',
  '/',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if path is public or static asset
  if (
    PUBLIC_PATHS.some(
      (path) => pathname === path || pathname.startsWith(path) || pathname.startsWith('/_next') || pathname.includes('.')
    ) ||
    pathname.startsWith('/admission') ||
    pathname.startsWith('/api/tenants/admission/public')
  ) {
    return NextResponse.next()
  }

  // Get authorization header or cookie (case-insensitive check)
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
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

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const userId = (payload.userId || payload.sub) as string
    let workspaceId = payload.workspaceId as string | undefined
    const role = payload.role as string
    const email = payload.email as string

    // Server-side RBAC restriction for gateway settings
    if (
      pathname.startsWith('/api/workspace/gateway') &&
      role !== 'WORKSPACE_ADMIN' &&
      role !== 'PLATFORM_SUPER_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 })
    }

    // Clone request headers and inject extracted workspace context
    const requestHeaders = new Headers(request.headers)
    if (userId) requestHeaders.set('x-user-id', userId)
    if (workspaceId) requestHeaders.set('x-workspace-id', workspaceId)
    if (role) requestHeaders.set('x-user-role', role)
    if (email) requestHeaders.set('x-user-email', email)

    // If workspaceId is missing from JWT (old token), set a sentinel so API routes
    // know to look up workspace from userId in the database
    if (!workspaceId && userId) {
      requestHeaders.set('x-resolve-workspace', 'true')
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  } catch (error) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or expired token' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
