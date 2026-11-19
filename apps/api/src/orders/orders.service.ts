import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@repo/database';
import { calculateOrderTotals, CartItemInput } from '@repo/pricing';

export interface CreateOrderDto {
  slug: string;
  branchId?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  notes?: string;
  clientGeneratedId?: string;
  items: CartItemInput[];
}

@Injectable()
export class OrdersService {
  async createOrder(dto: CreateOrderDto) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: dto.slug },
      include: { branches: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Comercio "${dto.slug}" no encontrado`);
    }

    const branchId = dto.branchId || tenant.branches[0]?.id;
    if (!branchId) {
      throw new BadRequestException(`El comercio "${dto.slug}" no tiene sucursales configuradas`);
    }

    const totals = calculateOrderTotals({ items: dto.items || [] });

    const lastOrder = await prisma.order.findFirst({
      where: { tenantId: tenant.id },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    });
    const nextOrderNumber = (lastOrder?.orderNumber ?? 0) + 1;

    const order = await prisma.order.create({
      data: {
        tenantId: tenant.id,
        branchId,
        orderNumber: nextOrderNumber,
        clientGeneratedId: dto.clientGeneratedId || null,
        type: dto.deliveryAddress ? 'DELIVERY' : 'TAKEDOUT',
        status: 'PENDING',
        customerName: dto.customerName || 'Cliente Menu Digital',
        customerPhone: dto.customerPhone || null,
        deliveryAddress: dto.deliveryAddress || null,
        notes: dto.notes || null,
        subtotal: totals.subtotal,
        deliveryfee: totals.deliveryFee,
        discountTotal: totals.discountTotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        items: {
          create: (dto.items || []).map((item) => ({
            tenantId: tenant.id,
            productId: item.productId,
            productNameSnapshot: item.name,
            unitPrice: item.basePrice,
            quantity: item.quantity,
            modifiers: {
              create: (item.modifiers || []).map((mod) => ({
                modifierNameSnapshot: mod.name,
                priceDelta: mod.priceDelta,
                quantity: mod.quantity ?? 1,
              })),
            },
          })),
        },
      },
      include: {
        items: {
          include: {
            modifiers: true,
          },
        },
      },
    });

    return {
      order,
      pricing: totals,
    };
  }

  async listOrdersBySlug(slug: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
    });

    if (!tenant) {
      throw new NotFoundException(`Comercio "${slug}" no encontrado`);
    }

    return prisma.order.findMany({
      where: { tenantId: tenant.id },
      include: {
        items: {
          include: {
            modifiers: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
