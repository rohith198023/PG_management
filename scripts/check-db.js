const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const workspaces = await prisma.workspace.findMany({ select: { id: true, name: true, slug: true } })
  console.log('Workspaces:', JSON.stringify(workspaces, null, 2))

  const users = await prisma.user.findMany({ select: { email: true, role: true, first_name: true, last_name: true } })
  console.log('Users:', JSON.stringify(users, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
