import { NextResponse } from 'next/server'
import { z } from 'zod'

const uploadSchema = z.object({
  fileName: z.string(),
  fileType: z.string(),
  documentType: z.enum(['AADHAAR', 'PASSPORT', 'DRIVING_LICENSE', 'LEASE_AGREEMENT']),
})

// POST /api/tenants/kyc/upload -> Generate secure upload URL for KYC documents
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validated = uploadSchema.parse(body)

    // Generate secure mock presigned object URL for R2/S3 storage bucket
    const fileId = `kyc_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const storageUrl = `https://storage.pg-sas.com/private-kyc/${validated.documentType.toLowerCase()}/${fileId}-${validated.fileName}`

    return NextResponse.json({
      message: 'Secure presigned upload URL generated',
      storageUrl,
      fileId,
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to generate KYC upload URL' }, { status: 500 })
  }
}
