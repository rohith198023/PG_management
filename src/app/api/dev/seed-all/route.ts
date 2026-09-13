import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const passwordHash = await bcrypt.hash('Admin@123', 12)

    // 1. Create Workspace
    const workspace = await prisma.workspace.upsert({
      where: { slug: 'royal-living-demo' },
      update: {},
      create: {
        name: 'Royal Living Stays',
        slug: 'royal-living-demo',
        email: 'admin@royalliving.com',
        phone: '+919876543210',
      },
    })

    // 2. Create Workspace Admin
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@royalliving.com' },
      update: { workspace_id: workspace.id },
      create: {
        workspace_id: workspace.id,
        email: 'admin@royalliving.com',
        password_hash: passwordHash,
        first_name: 'Rajesh',
        last_name: 'Kumar',
        phone: '+919876543210',
        role: 'WORKSPACE_ADMIN',
      },
    })

    // 3. Create Manager User
    await prisma.user.upsert({
      where: { email: 'manager@royalliving.com' },
      update: { workspace_id: workspace.id },
      create: {
        workspace_id: workspace.id,
        email: 'manager@royalliving.com',
        password_hash: passwordHash,
        first_name: 'Suresh',
        last_name: 'Patel',
        phone: '+919876543211',
        role: 'MANAGER',
      },
    })

    // 3b. Create Platform Super Admin
    await prisma.user.upsert({
      where: { email: 'superadmin@pgsas.com' },
      update: { workspace_id: workspace.id },
      create: {
        workspace_id: workspace.id,
        email: 'superadmin@pgsas.com',
        password_hash: passwordHash,
        first_name: 'Super',
        last_name: 'Admin',
        phone: '+919999999999',
        role: 'PLATFORM_SUPER_ADMIN',
      },
    })

    // 4. Create Property if not exists
    let property = await prisma.property.findFirst({
      where: { workspace_id: workspace.id, name: 'Royal Living — HSR Branch' },
    })

    if (!property) {
      property = await prisma.property.create({
        data: {
          workspace_id: workspace.id,
          name: 'Royal Living — HSR Branch',
          address: 'Plot 42, 27th Main Rd, HSR Layout, Bengaluru',
          property_type: 'PG',
          amenities: ['WiFi', 'Air Conditioning', 'Power Backup', 'Washing Machine'],
        },
      })

      // 5. Floor
      const floor1 = await prisma.floor.create({
        data: {
          workspace_id: workspace.id,
          property_id: property.id,
          floor_number: 1,
          name: 'First Floor',
        },
      })

      // 6. Room 101
      const room101 = await prisma.room.create({
        data: {
          workspace_id: workspace.id,
          property_id: property.id,
          floor_id: floor1.id,
          room_number: '101',
          capacity: 2,
          rent_amount: 8500,
          deposit_amount: 15000,
          amenities: ['Attached Washroom', 'Balcony'],
        },
      })

      // 7. Bed A (Occupied)
      const bedA = await prisma.bed.create({
        data: {
          workspace_id: workspace.id,
          property_id: property.id,
          room_id: room101.id,
          bed_number: '101-A',
          status: 'OCCUPIED',
        },
      })

      // 8. Bed B (Vacant)
      await prisma.bed.create({
        data: {
          workspace_id: workspace.id,
          property_id: property.id,
          room_id: room101.id,
          bed_number: '101-B',
          status: 'VACANT',
        },
      })

      // 9. Room 102
      const room102 = await prisma.room.create({
        data: {
          workspace_id: workspace.id,
          property_id: property.id,
          floor_id: floor1.id,
          room_number: '302',
          capacity: 2,
          rent_amount: 9000,
          deposit_amount: 15000,
          amenities: ['Attached Washroom'],
        },
      })

      await prisma.bed.create({
        data: {
          workspace_id: workspace.id,
          property_id: property.id,
          room_id: room102.id,
          bed_number: '302-A',
          status: 'VACANT',
        },
      })

      await prisma.bed.create({
        data: {
          workspace_id: workspace.id,
          property_id: property.id,
          room_id: room102.id,
          bed_number: '302-B',
          status: 'VACANT',
        },
      })

    }

    // Ensure tenant user and active lease exist
    const tenantUser = await prisma.user.upsert({
      where: { email: 'tenant@royalliving.com' },
      update: { workspace_id: workspace.id },
      create: {
        workspace_id: workspace.id,
        email: 'tenant@royalliving.com',
        password_hash: passwordHash,
        first_name: 'Anish',
        last_name: 'Sharma',
        phone: '+919876543212',
        role: 'TENANT',
      },
    })

    const occupiedBed = await prisma.bed.findFirst({
      where: { workspace_id: workspace.id },
    })

    if (occupiedBed) {
      const tenantProfile = await prisma.tenantProfile.upsert({
        where: { user_id: tenantUser.id },
        update: { workspace_id: workspace.id, bed_id: occupiedBed.id },
        create: {
          workspace_id: workspace.id,
          user_id: tenantUser.id,
          bed_id: occupiedBed.id,
          emergency_contact: '+919800000000',
        },
      })

      let lease = await prisma.lease.findFirst({
        where: { workspace_id: workspace.id, tenant_id: tenantProfile.id, status: 'ACTIVE' },
      })

      if (!lease) {
        lease = await prisma.lease.create({
          data: {
            workspace_id: workspace.id,
            tenant_id: tenantProfile.id,
            bed_id: occupiedBed.id,
            start_date: new Date(),
            rent_amount: 8500,
            deposit_amount: 15000,
            status: 'ACTIVE',
          },
        })
      }

      const existingInvoice = await prisma.invoice.findFirst({
        where: { workspace_id: workspace.id, tenant_id: tenantProfile.id },
      })

      if (!existingInvoice) {
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + 7)

        await prisma.invoice.create({
          data: {
            workspace_id: workspace.id,
            tenant_id: tenantProfile.id,
            invoice_number: `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-0001`,
            issue_date: new Date(),
            due_date: dueDate,
            subtotal: 8500,
            tax_amount: 0,
            total_amount: 8500,
            amount_paid: 0,
            status: 'ISSUED',
            line_items: {
              create: [
                {
                  description: 'Monthly Room Rent — Room 101 (Bed 101-A)',
                  quantity: 1,
                  unit_price: 8500,
                  amount: 8500,
                },
              ],
            },
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: '🌱 Database seeded successfully! Login with admin@royalliving.com / Admin@123',
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
      admin: { id: adminUser.id, email: adminUser.email },
    })
  } catch (error: any) {
    console.error('Seed Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 })
  }
}
