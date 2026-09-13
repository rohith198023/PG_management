import { NextResponse } from 'next/server'
import { verifyAccessToken, JWTPayload } from '@/lib/auth'
import { UserRole } from '@prisma/client'

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  PLATFORM_SUPER_ADMIN: 100,
  WORKSPACE_ADMIN: 80,
  MANAGER: 60,
  STAFF: 40,
  TENANT: 20,
}

export function hasRolePermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

export function canManageWorkspaceSettings(role: UserRole): boolean {
  return role === 'WORKSPACE_ADMIN' || role === 'PLATFORM_SUPER_ADMIN'
}

export function canManageInventory(role: UserRole): boolean {
  return role === 'WORKSPACE_ADMIN' || role === 'PLATFORM_SUPER_ADMIN'
}

export function canVerifyPayments(role: UserRole): boolean {
  return role === 'WORKSPACE_ADMIN' || role === 'MANAGER' || role === 'PLATFORM_SUPER_ADMIN'
}

export function canManageTenants(role: UserRole): boolean {
  return role === 'WORKSPACE_ADMIN' || role === 'MANAGER' || role === 'PLATFORM_SUPER_ADMIN'
}

export function canAccessKitchenHeadcount(role: UserRole): boolean {
  return role === 'WORKSPACE_ADMIN' || role === 'MANAGER' || role === 'STAFF' || role === 'PLATFORM_SUPER_ADMIN'
}

/**
 * Extracts and verifies the JWT authentication session from request headers or cookies.
 */
export async function requireAuth(
  request: Request
): Promise<{ session: JWTPayload; error?: undefined } | { error: string; response: NextResponse }> {
  // 1. Try Authorization Header
  const authHeader = request.headers.get('authorization')
  let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

  // 2. Try Cookies
  if (!token) {
    const cookieHeader = request.headers.get('cookie')
    if (cookieHeader) {
      const match = cookieHeader.match(/access_token=([^;]+)/)
      if (match) token = match[1]
    }
  }

  if (!token) {
    return {
      error: 'Unauthorized: Missing token',
      response: NextResponse.json({ error: 'Unauthorized: Missing authentication token' }, { status: 401 }),
    }
  }

  const payload = verifyAccessToken(token)
  if (!payload) {
    return {
      error: 'Unauthorized: Invalid or expired token',
      response: NextResponse.json({ error: 'Unauthorized: Invalid or expired token' }, { status: 401 }),
    }
  }

  return { session: payload }
}

/**
 * Validates authentication session AND checks user role permissions.
 */
export async function requireRole(
  request: Request,
  allowedRoles: UserRole[]
): Promise<{ session: JWTPayload; error?: undefined } | { error: string; response: NextResponse }> {
  const authResult = await requireAuth(request)
  if (!('session' in authResult)) return authResult

  const { session } = authResult
  if (!allowedRoles.includes(session.role) && session.role !== 'PLATFORM_SUPER_ADMIN') {
    return {
      error: 'Forbidden: Insufficient permissions',
      response: NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 }),
    }
  }

  return { session, error: undefined }
}
