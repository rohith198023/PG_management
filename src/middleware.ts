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

// ── Security Response Headers (Phase 11) ────────────────────────────────────
function applySecurityHeaders(response: NextResponse): NextResponse {
  // Prevent MIME-type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')
  // Referrer policy — don't leak URL to third-party
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  // Block dangerous browser features
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  // XSS protection (legacy browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block')
  // HSTS — enforce HTTPS for 1 year (only meaningful behind TLS termination)
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  // Remove server fingerprint header
  response.headers.delete('X-Powered-By')
  return response
}

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
    const res = NextResponse.next()
    return applySecurityHeaders(res)
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
      const res = NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 })
      return applySecurityHeaders(res)
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const userId = (payload.userId || payload.sub) as string
    let workspaceId = payload.workspaceId as string | undefined
    const role = payload.role as string
    const email = payload.email as string

    // ── Super-Admin route guard ─────────────────────────────────────────────
    if (pathname.startsWith('/super-admin') && role !== 'PLATFORM_SUPER_ADMIN') {
      if (pathname.startsWith('/api/')) {
        const res = NextResponse.json({ error: 'Forbidden: Super-Admin access required' }, { status: 403 })
        return applySecurityHeaders(res)
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // ── Server-side RBAC restriction for gateway settings ──────────────────
    if (
      pathname.startsWith('/api/workspace/gateway') &&
      role !== 'WORKSPACE_ADMIN' &&
      role !== 'PLATFORM_SUPER_ADMIN'
    ) {
      const res = NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 })
      return applySecurityHeaders(res)
    }

    // ── Clone request headers and inject extracted workspace context ────────
    const requestHeaders = new Headers(request.headers)
    if (userId) requestHeaders.set('x-user-id', userId)
    if (workspaceId) requestHeaders.set('x-workspace-id', workspaceId)
    if (role) requestHeaders.set('x-user-role', role)
    if (email) requestHeaders.set('x-user-email', email)

    // If workspaceId is missing from JWT (old token), set a sentinel so API
    // routes know to look up workspace from userId in the database
    if (!workspaceId && userId) {
      requestHeaders.set('x-resolve-workspace', 'true')
    }

    const res = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
    return applySecurityHeaders(res)
  } catch (error) {
    if (pathname.startsWith('/api/')) {
      const res = NextResponse.json({ error: 'Unauthorized: Invalid or expired token' }, { status: 401 })
      return applySecurityHeaders(res)
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
