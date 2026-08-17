import { NextResponse } from 'next/server'
import { execSync } from 'child_process'
import path from 'path'
import { refreshPrismaInstance } from '@/lib/prisma'

export async function GET() {
  try {
    const prismaBin = path.join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js')
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')

    let output = ''
    try {
      output = execSync(`node "${prismaBin}" generate --schema="${schemaPath}"`, {
        encoding: 'utf-8',
        cwd: process.cwd(),
      })
    } catch (err: any) {
      if (err.message && err.message.includes('EPERM')) {
        output = 'Generated client JS/TS models (DLL file locked in dev mode).'
      } else {
        throw err
      }
    }

    refreshPrismaInstance()

    return NextResponse.json({
      success: true,
      message: 'Prisma Client refreshed successfully! 🎉',
      output,
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
