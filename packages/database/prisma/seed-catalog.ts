import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: 'la-hamburgueseria' },
  });

  if (!tenant) {
    throw new Error('No se encontro el tenant la-hamburgueseria');
  }

  let category = await prisma.category.findFirst({
    where: { tenantId: tenant.id, name: 'Hamburguesas' },
  });

  if (!category) {
    category = await prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: 'Hamburguesas',
        sortOrder: 1,
      },
    });
  }

  let product = await prisma.product.findFirst({
    where: { tenantId: tenant.id, name: 'Clasica de la Casa' },
  });

  if (!product) {
    product = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        categoryId: category.id,
        name: 'Clasica de la Casa',
        description: 'Carne artesanal 150g, queso, lechuga, tomate y salsa especial.',
        basePrice: 22000,
        images: [],
      },
    });
  }

  const existingGroup = await prisma.modifierGroup.findFirst({
    where: { tenantId: tenant.id, name: 'Adiciones' },
  });

  if (!existingGroup) {
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

    await prisma.productModifierGroup.create({
      data: {
        productId: product.id,
        modifierGroupId: toppingsGroup.id,
        sortOrder: 1,
      },
    });
  }

  console.log('Catalogo listo para:', tenant.slug);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
