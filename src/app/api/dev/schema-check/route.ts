import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // List all tables
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    ` as any[]

    // Count workspaces
    let workspaceCount: any = null
    let workspaceData: any = null
    try {
      const rows = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Workspace";` as any[]
      workspaceCount = Number(rows[0]?.count)
      
      const ws = await prisma.$queryRaw`SELECT id, name, slug FROM "Workspace" LIMIT 3;` as any[]
      workspaceData = ws
    } catch (e: any) {
      workspaceCount = `error: ${e.message}`
    }

    return NextResponse.json({
      tables: tables.map((t: any) => t.table_name),
      workspaceCount,
      workspaceData,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
