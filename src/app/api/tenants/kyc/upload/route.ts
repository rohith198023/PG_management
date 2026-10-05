import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';
import { z } from 'zod';

const kycUploadSchema = z.object({
  tenantId: z.string().uuid().optional(),
  idProofType: z.string().min(2, 'ID Proof Type is required (e.g., Aadhaar, PAN, Passport)'),
  idProofNumber: z.string().min(4, 'Valid ID Proof Number is required'),
  idProofUrl: z.string().url('A valid document URL is required'),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ('response' in auth) return auth.response;

    const workspaceId = auth.session.workspaceId;
    const userId = auth.session.userId;
    const role = auth.session.role;

    const body = await request.json();
    const validated = kycUploadSchema.parse(body);

    let targetTenantId = validated.tenantId;

    // If tenant is calling, ensure they are updating their own profile
    if (role === 'TENANT') {
      const ownProfile = await prisma.tenantProfile.findFirst({
        where: { user_id: userId, workspace_id: workspaceId },
      });
      if (!ownProfile) {
        return NextResponse.json({ error: 'Tenant profile not found' }, { status: 404 });
      }
      targetTenantId = ownProfile.id;
    } else {
      // Owner / Manager updating a specific tenant
      if (!targetTenantId) {
        return NextResponse.json({ error: 'tenantId is required for staff/admin upload' }, { status: 400 });
      }
    }

    const updated = await prisma.tenantProfile.update({
      where: {
        id: targetTenantId,
        workspace_id: workspaceId,
      },
      data: {
        id_proof_type: validated.idProofType,
        id_proof_number: validated.idProofNumber,
        id_proof_url: validated.idProofUrl,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'KYC documents updated successfully',
      tenantId: updated.id,
      idProofType: updated.id_proof_type,
      idProofNumber: updated.id_proof_number,
      idProofUrl: updated.id_proof_url,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('KYC Upload Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update KYC documents' }, { status: 500 });
  }
}
