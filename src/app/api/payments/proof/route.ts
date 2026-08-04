import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const uploadProofSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().positive(),
  proofImageUrl: z.string().min(1, 'Proof image URL is required'),
  utrNumber: z.string().optional(),
  notes: z.string().optional(),
})

// GET /api/payments/proof -> Pending Verification Queue for Managers/Admins
export async function GET(request: Request) {
  const workspaceId = request.headers.get('x-workspace-id')
  const role = request.headers.get('x-user-role')

  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (role !== 'WORKSPACE_ADMIN' && role !== 'MANAGER' && role !== 'PLATFORM_SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 })
  }

  const pendingProofs = await prisma.paymentProof.findMany({
    where: {
      workspace_id: workspaceId,
      payment: {
        status: 'PENDING_VERIFICATION',
      },
    },
    include: {
      payment: {
        include: {
          tenant: {
            include: {
              user: true,
              bed: {
                include: {
                  room: true,
                },
              },
            },
          },
          invoice: true,
        },
      },
    },
    orderBy: { created_at: 'desc' },
  })

  return NextResponse.json({ pendingProofs })
}

// POST /api/payments/proof -> Tenant Upload Payment Proof
export async function POST(request: Request) {
  const workspaceId = request.headers.get('x-workspace-id')
  const userId = request.headers.get('x-user-id')

  if (!workspaceId || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const validated = uploadProofSchema.parse(body)

    const tenant = await prisma.tenantProfile.findUnique({
      where: { user_id: userId },
    })

    if (!tenant || tenant.workspace_id !== workspaceId) {
      return NextResponse.json({ error: 'Forbidden: Tenant profile not found' }, { status: 403 })
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: validated.invoiceId,
        workspace_id: workspaceId,
        tenant_id: tenant.id,
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Create Payment & PaymentProof in transaction (Status remains PENDING_VERIFICATION until human approval)
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          workspace_id: workspaceId,
          tenant_id: tenant.id,
          invoice_id: invoice.id,
          amount: validated.amount,
          source: 'MANUAL_UPLOAD',
          status: 'PENDING_VERIFICATION',
          transaction_ref: validated.utrNumber || `PROOF-${Date.now()}`,
        },
      })

      const proof = await tx.paymentProof.create({
        data: {
          workspace_id: workspaceId,
          payment_id: payment.id,
          proof_image_url: validated.proofImageUrl,
          utr_number: validated.utrNumber,
          notes: validated.notes,
        },
      })

      return { payment, proof }
    })

    return NextResponse.json({
      message: 'Payment proof uploaded successfully and submitted for manager verification',
      payment: result.payment,
    }, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Payment proof upload error:', error)
    return NextResponse.json({ error: 'Failed to upload payment proof' }, { status: 500 })
  }
}
