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
