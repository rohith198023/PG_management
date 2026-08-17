import { NextResponse } from 'next/server'
import { execSync } from 'child_process'
import path from 'path'

export async function GET() {
  try {
    const prismaBin = path.join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js')
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')

    const output = execSync(`node "${prismaBin}" db push --accept-data-loss --force-reset --schema="${schemaPath}"`, {
      encoding: 'utf-8',
      cwd: process.cwd(),
      env: { ...process.env },
    })

    return NextResponse.json({
      success: true,
      message: 'Database schema reset & pushed to PostgreSQL successfully! 🗄️',
      output: output.toString(),
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stderr: error.stderr?.toString(),
      stdout: error.stdout?.toString(),
    })
  }
}
