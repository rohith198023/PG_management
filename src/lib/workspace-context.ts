import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/rbac'

export interface WorkspaceContext {
  workspaceId: string | null
  role: string | null
  userId: string | null
}

/**
 * Resolves workspace context from multiple sources with graceful fallback chain:
 * 1. x-workspace-id header (injected by middleware from JWT)
 * 2. JWT session payload via requireAuth (reads cookie/Authorization header)
 * 3. User's workspace_id from DB (for old JWTs without workspaceId claim)
 * 4. First workspace in DB (last resort — useful for seeded admin accounts)
 *
 * Uses $queryRaw for DB fallbacks to avoid broken Prisma delegate cache in dev.
 */
export async function resolveWorkspaceContext(request: Request): Promise<WorkspaceContext> {
  let workspaceId = request.headers.get('x-workspace-id')
  let role = request.headers.get('x-user-role')
  let userId = request.headers.get('x-user-id')
  const needsResolve = request.headers.get('x-resolve-workspace') === 'true'

  // Fast path: middleware already injected all headers
  if (workspaceId && userId && !needsResolve) {
    return { workspaceId, role, userId }
  }

  // Try JWT from cookie/auth header via requireAuth
  const authResult = await requireAuth(request)
  if (!('response' in authResult)) {
    const { session } = authResult
    userId = userId || session.userId
    role = role || String(session.role)

    if (session.workspaceId) {
      return { workspaceId: session.workspaceId, role, userId }
    }
  }

  // Fallback: look up workspace from DB using userId (SQL fallback for dev cache issues)
  if (userId) {
    try {
      // Try ORM first
      const user = await (prisma as any).user?.findUnique?.({
        where: { id: userId },
        select: { workspace_id: true, role: true },
      })
      if (user?.workspace_id) {
        return {
          workspaceId: user.workspace_id,
          role: role || String(user.role),
          userId,
        }
      }
    } catch {}
    
    // SQL fallback
    try {
      const rows = await prisma.$queryRaw`
        SELECT workspace_id, role FROM "User" WHERE id = ${userId}::uuid LIMIT 1;
      ` as any[]
      if (rows[0]?.workspace_id) {
        return {
          workspaceId: rows[0].workspace_id,
          role: role || String(rows[0].role),
          userId,
        }
      }
    } catch (e) {
      console.warn('[resolveWorkspaceContext] User SQL lookup failed:', e)
    }
  }

  // Strict security: Never guess or fallback to a default/first workspace.
  // If workspaceId cannot be resolved from JWT or the user's DB record, return null.
  return { workspaceId: null, role, userId }
}

