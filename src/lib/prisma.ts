import { PrismaClient as BasePrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prismaInstance: any
}

function createClient(): any {
  if (typeof require !== 'undefined' && require.cache) {
    Object.keys(require.cache).forEach((key) => {
      if (key.includes('.prisma') || key.includes('@prisma')) {
        delete require.cache[key]
      }
    })
  }

  try {
    const { PrismaClient } = require('@prisma/client')
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
  } catch {
    return new BasePrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
  }
}

// Reset instance to ensure fresh schema delegates are loaded
export function refreshPrismaInstance() {
  if (globalForPrisma.prismaInstance) {
    try {
      globalForPrisma.prismaInstance.$disconnect()
    } catch {}
    globalForPrisma.prismaInstance = undefined
  }
}

export const prisma = new Proxy({} as any, {
  get(_target, prop: string | symbol, _receiver) {
    // In dev mode, check if mealWeeklyTemplate or new delegates exist. If not, refresh!
    if (!globalForPrisma.prismaInstance || (typeof prop === 'string' && !prop.startsWith('$') && !prop.startsWith('_') && !(globalForPrisma.prismaInstance as any)[prop])) {
      globalForPrisma.prismaInstance = createClient()
    }

    let instance = globalForPrisma.prismaInstance
    let value = (instance as any)[prop]

    if (typeof value === 'function') {
      return value.bind(instance)
    }

    return value
  },
})
