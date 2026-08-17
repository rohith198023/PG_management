import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/rbac'
import { z } from 'zod'

const uploadProofSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  utrNumber: z.string().min(6, 'UTR or Transaction Ref Number must be at least 6 characters'),
  amount: z.number().positive('Payment amount must be greater than 0'),
  proofImageUrl: z.string().min(5, 'Proof image URL is required'),
  notes: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)
    if ('response' in auth) return auth.response

    const workspaceId = auth.session.workspaceId
    const body = await req.json()
    const { invoiceId, utrNumber, amount, proofImageUrl, notes } = uploadProofSchema.parse(body)

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        workspace_id: workspaceId,
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (invoice.status === 'PAID') {
      return NextResponse.json({ error: 'Invoice is already paid in full' }, { status: 400 })
    }

    const existingPayment = await prisma.payment.findFirst({
      where: { transaction_ref: utrNumber },
    })

    if (existingPayment) {
      return NextResponse.json(
        { error: 'A payment proof with this UTR/Transaction Reference has already been submitted.' },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          workspace_id: workspaceId,
          tenant_id: invoice.tenant_id,
          invoice_id: invoice.id,
          amount: amount,
          source: 'MANUAL_UPLOAD',
          status: 'PENDING_VERIFICATION',
          transaction_ref: utrNumber,
        },
      })

      const proof = await tx.paymentProof.create({
        data: {
          workspace_id: workspaceId,
          payment_id: payment.id,
          proof_image_url: proofImageUrl,
          utr_number: utrNumber,
          notes: notes || null,
        },
      })

      return { payment, proof }
    })

    return NextResponse.json({
      message: 'Payment proof submitted successfully. Pending manager verification.',
      paymentId: result.payment.id,
      proofId: result.proof.id,
      status: result.payment.status,
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Submit Payment Proof Error:', error)
    return NextResponse.json({ error: 'Failed to submit payment proof' }, { status: 500 })
  }
}
