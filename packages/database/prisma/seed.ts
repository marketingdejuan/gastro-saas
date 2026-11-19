import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const proPlan = await prisma.plan.upsert({
    where: { code: 'PRO' },
    update: {},
    create: {
      code: 'PRO',
      name: 'Plan Pro',
      monthlyPrice: 89000,
      featureFlags: {
        posOffline: true,
        kds: true,
        whatsappOrders: true,
        customDomain: true,
      },
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'la-hamburgueseria' },
    update: {},
    create: {
      name: 'La Hamburguesería Demo',
      slug: 'la-hamburgueseria',
      currency: 'COP',
      whatsappPhone: '573000000000',
      planId: proPlan.id,
      themeConfig: {
        primaryColor: '#E11D48',
        mode: 'orders_and_whatsapp',
      },
    },
  });

  const existingBranch = await prisma.branch.findFirst({
    where: { tenantId: tenant.id },
  });

  if (!existingBranch) {
    await prisma.branch.create({
      data: {
        tenantId: tenant.id,
        name: 'Sede Principal',
        address: 'Calle 10 # 40-12',
        tables: {
          create: [{ name: 'Mesa 1' }, { name: 'Mesa 2' }],
        },
      },
    });
  }

  const existingCategory = await prisma.category.findFirst({
    where: { tenantId: tenant.id, name: 'Hamburguesas' },
  });

  if (!existingCategory) {
    const category = await prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: 'Hamburguesas',
        sortOrder: 1,
      },
    });

    const toppingsGroup = await prisma.modifierGroup.create({
      data: {
        tenantId: tenant.id,
        name: 'Adiciones',
        minSelect: 0,
        maxSelect: 5,
        options: {
          create: [
            { tenantId: tenant.id, name: 'Tocineta ahumada', priceDelta: 4500 },
            { tenantId: tenant.id, name: 'Queso cheddar extra', priceDelta: 3500 },
            { tenantId: tenant.id, name: 'Papas en casco', priceDelta: 6000 },
          ],
        },
      },
    });

    const product = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        categoryId: category.id,
        name: 'Clásica de la Casa',
        description: 'Carne artesanal 150g, queso, lechuga, tomate y salsa especial.',
        basePrice: 22000,
        images: [],
      },
    });

    await prisma.productModifierGroup.create({
      data: {
        productId: product.id,
        modifierGroupId: toppingsGroup.id,
        sortOrder: 1,
      },
    });
  }

  console.log('Seed completado correctamente para:', tenant.slug);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
