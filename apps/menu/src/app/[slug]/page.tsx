import { notFound } from 'next/navigation';
import { prisma } from '@repo/database';
import MenuStorefront from '@/components/MenuStorefront';

export const dynamic = 'force-dynamic';

export default async function TenantMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    include: {
      branches: true,
      categories: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          products: {
            where: { isAvailable: true },
            include: {
              modifiers: {
                orderBy: { sortOrder: 'asc' },
                include: {
                  modifierGroup: {
                    include: {
                      options: { where: { isAvailable: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!tenant) notFound();

  const theme = (tenant.themeConfig as { primaryColor?: string } | null) || {};
  const isOpen = tenant.branches[0]?.isOpen ?? true;

  const serializedCategories = tenant.categories.map((cat: any) => ({
    id: cat.id,
    name: cat.name,
    products: cat.products.map((prod: any) => ({
      id: prod.id,
      name: prod.name,
      description: prod.description,
      basePrice: Number(prod.basePrice),
      modifiers: prod.modifiers.map((pm: any) => ({
        id: pm.modifierGroup.id,
        name: pm.modifierGroup.name,
        minSelect: pm.modifierGroup.minSelect,
        maxSelect: pm.modifierGroup.maxSelect,
        options: pm.modifierGroup.options.map((opt: any) => ({
          id: opt.id,
          name: opt.name,
          priceDelta: Number(opt.priceDelta),
        })),
      })),
    })),
  }));

  return (
    <MenuStorefront
      tenant={{
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        currency: tenant.currency,
        whatsappPhone: tenant.whatsappPhone,
        primaryColor: theme.primaryColor || '#E11D48',
        isOpen,
      }}
      categories={serializedCategories}
    />
  );
}