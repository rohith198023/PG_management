import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const xWorkspaceId = request.headers.get('x-workspace-id')
  const xUserRole = request.headers.get('x-user-role')
  const xUserId = request.headers.get('x-user-id')

  // SQL workspace count
  let workspaceData: any = null
  try {
    const rows = await prisma.$queryRaw`SELECT id, name, slug FROM "Workspace" LIMIT 3;` as any[]
    workspaceData = rows
  } catch (e: any) {
    workspaceData = `error: ${e.message}`
  }

  // SQL user count
  let userData: any = null
  try {
    const rows = await prisma.$queryRaw`SELECT email, role, workspace_id FROM "User" LIMIT 5;` as any[]
    userData = rows
  } catch (e: any) {
    userData = `error: ${e.message}`
  }

  return NextResponse.json({
    injectedHeaders: { xWorkspaceId, xUserRole, xUserId },
    workspaceData,
    userData,
  })
}
