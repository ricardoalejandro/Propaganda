import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seed() {
  console.log('🌱 Seeding database...')

  // Crear embudo por defecto si no existe
  const defaultFunnel = await prisma.funnel.findFirst({
    where: { isDefault: true },
  })

  if (!defaultFunnel) {
    console.log('Creating default funnel...')
    const funnel = await prisma.funnel.create({
      data: {
        name: 'Leads',
        description: 'Embudo principal de ventas',
        isDefault: true,
        color: '#22c55e',
        stages: {
          create: [
            { name: 'Nuevo', color: '#3b82f6', position: 0 },
            { name: 'Contactado', color: '#f59e0b', position: 1 },
            { name: 'Propuesta', color: '#8b5cf6', position: 2 },
            { name: 'Negociación', color: '#ec4899', position: 3 },
            { name: 'Ganado', color: '#22c55e', position: 4, isWon: true },
            { name: 'Perdido', color: '#ef4444', position: 5, isLost: true },
          ],
        },
      },
    })
    console.log(`✅ Created funnel: ${funnel.name} with 6 stages`)
  } else {
    console.log('Default funnel already exists')
  }

  console.log('✅ Seeding complete!')
}

seed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
