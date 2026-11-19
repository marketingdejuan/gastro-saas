import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@repo/database';
import { calculateOrderTotals, CartItemInput } from '@repo/pricing';

@Injectable()
export class StorefrontService {
  async getTenantCatalog(slug: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      include: {
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

    if (!tenant) {
      throw new NotFoundException(`Comercio "${slug}" no encontrado`);
    }

    return tenant;
  }

  quoteOrder(items: CartItemInput[]) {
    return calculateOrderTotals({ items });
  }
}
