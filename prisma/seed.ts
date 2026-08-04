import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding local development workspace...')

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
    update: {},
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
  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@royalliving.com' },
    update: {},
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

  // 4. Create Property
  const property = await prisma.property.create({
    data: {
      workspace_id: workspace.id,
      name: 'Royal Living — HSR Branch',
      address: 'Plot 42, 27th Main Rd, HSR Layout, Bengaluru',
      property_type: 'PG',
      amenities: ['WiFi', 'Air Conditioning', 'Power Backup', 'Washing Machine'],
    },
  })

  // 5. Create Floor, Room, Bed
  const floor1 = await prisma.floor.create({
    data: {
      workspace_id: workspace.id,
      property_id: property.id,
      floor_number: 1,
      name: 'First Floor',
    },
  })

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

  const bedA = await prisma.bed.create({
    data: {
      workspace_id: workspace.id,
      property_id: property.id,
      room_id: room101.id,
      bed_number: '101-A',
      status: 'OCCUPIED',
    },
  })

  const bedB = await prisma.bed.create({
    data: {
      workspace_id: workspace.id,
      property_id: property.id,
      room_id: room101.id,
      bed_number: '101-B',
      status: 'VACANT',
    },
  })

  // 6. Create Tenant User & Profile
  const tenantUser = await prisma.user.upsert({
    where: { email: 'tenant@royalliving.com' },
    update: {},
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

  const tenantProfile = await prisma.tenantProfile.create({
    data: {
      workspace_id: workspace.id,
      user_id: tenantUser.id,
      bed_id: bedA.id,
      emergency_contact: '+919800000000',
    },
  })

  // 7. Create Meal Menu for Today
  const today = new Date()
  const lunchMenu = await prisma.mealMenu.create({
    data: {
      workspace_id: workspace.id,
      date: today,
      slot: 'LUNCH',
      title: 'Paneer Butter Masala & Dal Tadka',
      description: 'Served with Butter Roti, Jeera Rice, and Salad',
      veg_available: true,
      non_veg_available: true,
      veg_price: 70,
      non_veg_price: 110,
      cutoff_time: new Date(today.getTime() + 4 * 60 * 60 * 1000), // 4 hrs from now
    },
  })

  console.log('Development seed complete! Login with admin@royalliving.com / Admin@123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
