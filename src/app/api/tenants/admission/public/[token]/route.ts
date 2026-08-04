import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, signAccessToken } from '@/lib/auth'
import { postJournalEntries } from '@/lib/ledger'
import { z } from 'zod'

const completeAdmissionSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  emergencyContact: z.string().min(10, 'Emergency contact phone is required'),
  idProofType: z.string().min(2, 'ID Proof type (Aadhaar/Passport/Driving License) is required'),
  idProofNumber: z.string().min(4, 'ID Proof number is required'),
  idProofUrl: z.string().min(1, 'ID Proof document scan URL is required'),
})

// GET /api/tenants/admission/public/[token] -> Fetch invite details for public onboarding form
export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  const invite = await prisma.admissionInvite.findUnique({
    where: { token: params.token },
    include: {
      workspace: true,
      bed: {
        include: {
          room: {
            include: {
              property: true,
            },
          },
        },
      },
    },
  })

  if (!invite || invite.is_used) {
    return NextResponse.json({ error: 'Admission invitation link is invalid or has already been used' }, { status: 404 })
  }

  if (new Date() > new Date(invite.expires_at)) {
    return NextResponse.json({ error: 'Admission invitation link has expired' }, { status: 400 })
  }

  return NextResponse.json({
    invite: {
      id: invite.id,
      firstName: invite.first_name,
      lastName: invite.last_name,
      email: invite.email,
      phone: invite.phone,
      rentAmount: Number(invite.rent_amount),
      depositAmount: Number(invite.deposit_amount),
      workspaceName: invite.workspace.name,
      propertyName: invite.bed.room.property.name,
      roomNumber: invite.bed.room.room_number,
      bedNumber: invite.bed.bed_number,
    },
  })
}

// POST /api/tenants/admission/public/[token] -> Complete digital onboarding & KYC submission
export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const invite = await prisma.admissionInvite.findUnique({
      where: { token: params.token },
      include: { bed: true },
    })

    if (!invite || invite.is_used) {
      return NextResponse.json({ error: 'Admission invitation link is invalid or has already been used' }, { status: 404 })
    }

    if (new Date() > new Date(invite.expires_at)) {
      return NextResponse.json({ error: 'Admission invitation link has expired' }, { status: 400 })
    }

    const body = await request.json()
    const validated = completeAdmissionSchema.parse(body)

    const workspaceId = invite.workspace_id
    const passwordHash = await hashPassword(validated.password)

    // Execute atomic transaction for tenant creation, bed status update, lease activation, and ledger posting
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create User account with TENANT role
      const user = await tx.user.create({
        data: {
          workspace_id: workspaceId,
          email: invite.email,
          password_hash: passwordHash,
          first_name: invite.first_name,
          last_name: invite.last_name,
          phone: invite.phone,
          role: 'TENANT',
        },
      })

      // 2. Create TenantProfile with digital KYC documents
      const tenantProfile = await tx.tenantProfile.create({
        data: {
          workspace_id: workspaceId,
          user_id: user.id,
          bed_id: invite.bed_id,
          emergency_contact: validated.emergencyContact,
          id_proof_type: validated.idProofType,
          id_proof_number: validated.idProofNumber,
          id_proof_url: validated.idProofUrl,
        },
      })

      // 3. Create & Activate Lease
      const startDate = new Date()
      const lease = await tx.lease.create({
        data: {
          workspace_id: workspaceId,
          tenant_id: tenantProfile.id,
          bed_id: invite.bed_id,
          start_date: startDate,
          rent_amount: invite.rent_amount,
          deposit_amount: invite.deposit_amount,
          status: 'ACTIVE',
        },
      })

      // 4. Update Bed state to OCCUPIED
      await tx.bed.update({
        where: { id: invite.bed_id },
        data: { status: 'OCCUPIED' },
      })

      // 5. Increment Room occupancy count
      await tx.room.update({
        where: { id: invite.bed.room_id },
        data: {
          occupancy: { increment: 1 },
        },
      })

      // 6. Mark AdmissionInvite as used
      await tx.admissionInvite.update({
        where: { id: invite.id },
        data: { is_used: true },
      })

      return { user, tenantProfile, lease }
    })

    // 7. Post Security Deposit General Ledger Transaction (Debit: Operating Cash 1010, Credit: Security Deposits Held 2010)
    await postJournalEntries(workspaceId, result.lease.id, [
      {
        accountCode: '1010', // Operating Cash
        debit: Number(invite.deposit_amount),
        credit: 0,
        description: `Security Deposit Collected for Tenant ${invite.first_name} ${invite.last_name}`,
      },
      {
        accountCode: '2010', // Tenant Security Deposits Held
        debit: 0,
        credit: Number(invite.deposit_amount),
        description: `Security Deposit Liability Held for Tenant ${invite.first_name} ${invite.last_name}`,
      },
    ])

    // Sign Access Token for immediate tenant login
    const accessToken = signAccessToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      workspaceId: workspaceId,
    })

    const response = NextResponse.json({
      message: 'Digital admission completed successfully! Welcome to your new home.',
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.first_name,
        lastName: result.user.last_name,
        role: result.user.role,
      },
      accessToken,
    })

    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400,
      path: '/',
    })

    return response
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Public onboarding error:', error)
    return NextResponse.json({ error: 'Failed to complete digital admission' }, { status: 500 })
  }
}
