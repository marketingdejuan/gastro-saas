import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@repo/database';
import { calculateOrderTotals, CartItemInput } from '@repo/pricing';

export interface CreateOrderDto {
  slug: string;
  branchId?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  tableNumber?: string;
  notes?: string;
  clientGeneratedId?: string;
  items: CartItemInput[];
}

export interface CreateTenantDto {
  name: string;
  slug?: string;
  whatsappPhone?: string;
  primaryColor?: string;
  currency?: string;
}

function slugifyName(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class OrdersService {
  async getStoreStatus(slug: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      include: { branches: true },
    });
    if (!tenant) {
      throw new NotFoundException(`Comercio "${slug}" no encontrado`);
    }
    const branch = tenant.branches[0];
    return {
      slug: tenant.slug,
      name: tenant.name,
      isOpen: branch ? Boolean(branch.isOpen) : true,
    };
  }

  async setStoreStatus(slug: string, isOpen: boolean) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      include: { branches: true },
    });
    if (!tenant) {
      throw new NotFoundException(`Comercio "${slug}" no encontrado`);
    }
    const branch = tenant.branches[0];
    if (branch) {
      await prisma.branch.update({
        where: { id: branch.id },
        data: { isOpen: Boolean(isOpen) },
      });
    } else {
      await prisma.branch.create({
        data: {
          tenantId: tenant.id,
          name: "Sede Principal",
          address: "Direccion principal",
          isOpen: Boolean(isOpen),
        },
      });
    }
    return { slug: tenant.slug, isOpen: Boolean(isOpen) };
  }

  async updateStoreConfig(
    slug: string,
    body: { name?: string; whatsappPhone?: string; primaryColor?: string },
  ) {
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      throw new NotFoundException(`Comercio "${slug}" no encontrado`);
    }
    const currentTheme = (tenant.themeConfig as Record<string, unknown> | null) || {};
    const nextTheme = {
      ...currentTheme,
      ...(body.primaryColor ? { primaryColor: body.primaryColor.trim() } : {}),
    };

    const updated = await prisma.tenant.update({
      where: { slug },
      data: {
        ...(body.name && body.name.trim() ? { name: body.name.trim() } : {}),
        ...(typeof body.whatsappPhone === "string"
          ? { whatsappPhone: body.whatsappPhone.trim() }
          : {}),
        themeConfig: nextTheme as never,
      },
    });

    return {
      slug: updated.slug,
      name: updated.name,
      whatsappPhone: updated.whatsappPhone,
      primaryColor: (nextTheme.primaryColor as string) || "#E11D48",
    };
  }

  async listTenants() {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        currency: true,
        whatsappPhone: true,
        themeConfig: true,
      },
    });

    return tenants.map((t) => {
      const theme = (t.themeConfig as { primaryColor?: string } | null) || {};
      return {
        ...t,
        primaryColor: theme.primaryColor || '#E11D48',
      };
    });
  }

  async createTenant(dto: CreateTenantDto) {
    if (!dto.name || !dto.name.trim()) {
      throw new BadRequestException('El nombre del restaurante es obligatorio');
    }

    const defaultPlan = await prisma.plan.findFirst();
    if (!defaultPlan) {
      throw new BadRequestException('No existe ningún plan configurado en la base de datos');
    }

    const baseSlug = slugifyName(dto.slug?.trim() || dto.name.trim()) || 'nuevo-restaurante';
    let finalSlug = baseSlug;
    let counter = 1;

    while (await prisma.tenant.findUnique({ where: { slug: finalSlug } })) {
      counter += 1;
      finalSlug = `${baseSlug}-${counter}`;
    }

    const primaryColor = dto.primaryColor?.trim() || '#E11D48';

    try {
      const created = await prisma.tenant.create({
        data: {
          name: dto.name.trim(),
          slug: finalSlug,
          plan: { connect: { id: defaultPlan.id } },
          currency: dto.currency?.trim() || 'COP',
          whatsappPhone: dto.whatsappPhone?.trim() || '573000000000',
          themeConfig: {
            primaryColor,
            mode: 'light',
          },
          branches: {
            create: {
              name: 'Sede Principal',
              address: 'Direccion principal',
              isOpen: true,
            },
          },
          categories: {
            create: {
              name: 'Especialidades',
              sortOrder: 1,
              isActive: true,
            },
          },
        },
      });

      return {
        ...created,
        primaryColor,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al crear el restaurante';
      throw new BadRequestException(message);
    }
  }

  async createOrder(dto: CreateOrderDto) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: dto.slug },
      include: {
        branches: true,
        categories: {
          include: { products: true },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Comercio "${dto.slug}" no encontrado`);
    }

    let branchId = dto.branchId || tenant.branches[0]?.id;
    if (!branchId) {
      const createdBranch = await prisma.branch.create({
        data: {
          tenantId: tenant.id,
          name: 'Sede Principal',
          address: 'Direccion principal',
        },
      });
      branchId = createdBranch.id;
    }

    const validProducts = tenant.categories.flatMap((c) => c.products);
    const validProductIds = new Set(validProducts.map((p) => p.id));
    const fallbackProductId = validProducts[0]?.id;

    const totals = calculateOrderTotals({ items: dto.items || [] });

    const lastOrder = await prisma.order.findFirst({
      where: { tenantId: tenant.id },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    });
    const nextOrderNumber = (lastOrder?.orderNumber ?? 0) + 1;

    try {
      const order = await prisma.order.create({
        data: {
          tenantId: tenant.id,
          branchId,
          orderNumber: nextOrderNumber,
          clientGeneratedId: dto.clientGeneratedId || null,
          type: dto.deliveryAddress ? 'DELIVERY' : 'TAKEOUT',
          status: 'PENDING',
          customerName: dto.customerName || 'Cliente Menu Digital',
          customerPhone: dto.customerPhone || null,
          deliveryAddress: dto.deliveryAddress || null,
          notes: dto.tableNumber ? `Mesa #${dto.tableNumber.trim()}${dto.notes ? ` · ${dto.notes}` : ""}` : (dto.notes || null),
          subtotal: totals.subtotal,
          deliveryFee: totals.deliveryFee,
          discountTotal: totals.discountTotal,
          taxTotal: totals.taxTotal,
          total: totals.total,
          items: {
            create: (dto.items || []).map((item) => {
              const resolvedProductId = validProductIds.has(item.productId)
                ? item.productId
                : fallbackProductId;

              if (!resolvedProductId) {
                throw new BadRequestException('El comercio no tiene productos configurados');
              }

              return {
                tenantId: tenant.id,
                productId: resolvedProductId,
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
              };
            }),
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al crear la orden';
      throw new BadRequestException(message);
    }
  }

  async trackOrder(slug: string, orderNumber: number) {
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      throw new NotFoundException(`Comercio "${slug}" no encontrado`);
    }
    const order = await prisma.order.findFirst({
      where: {
        tenantId: tenant.id,
        orderNumber: Number(orderNumber),
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        type: true,
        total: true,
        createdAt: true,
      },
    });
    if (!order) {
      throw new NotFoundException("Pedido no encontrado");
    }
    return {
      ...order,
      total: Number(order.total),
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

  async updateOrderStatus(orderId: string, status: string) {
    return prisma.order.update({
      where: { id: orderId },
      data: { status: status as never },
      include: {
        items: {
          include: {
            modifiers: true,
          },
        },
      },
    });
  }

  async createQuickProduct(
    slug: string,
    body: { categoryName: string; name: string; description?: string; basePrice: number },
  ) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      include: { categories: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Comercio "${slug}" no encontrado`);
    }

    const catName = body.categoryName.trim() || 'Recomendados';
    let category = tenant.categories.find(
      (c) => c.name.toLowerCase() === catName.toLowerCase(),
    );

    if (!category) {
      category = await prisma.category.create({
        data: {
          tenantId: tenant.id,
          name: catName,
          sortOrder: tenant.categories.length + 1,
        },
      });
    }

    return prisma.product.create({
      data: {
        tenantId: tenant.id,
        categoryId: category.id,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        basePrice: Number(body.basePrice) || 0,
        isAvailable: true,
        images: [],
      },
      include: { category: true },
    });
  }

  async listCatalogProducts(slug: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            products: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Comercio "${slug}" no encontrado`);
    }

    return tenant.categories.flatMap((cat) =>
      cat.products.map((prod) => ({
        ...prod,
        basePrice: Number(prod.basePrice),
        categoryName: cat.name,
      })),
    );
  }

  async createCategory(slug: string, name: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      include: { categories: true },
    });
    if (!tenant) {
      throw new NotFoundException(`Comercio "${slug}" no encontrado`);
    }
    const cleanName = name.trim();
    if (!cleanName) {
      throw new BadRequestException("El nombre de la categoría es obligatorio");
    }
    const existing = tenant.categories.find(
      (c) => c.name.toLowerCase() === cleanName.toLowerCase(),
    );
    if (existing) {
      return existing;
    }
    return prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: cleanName,
        sortOrder: tenant.categories.length + 1,
        isActive: true,
      },
    });
  }

  async updateProduct(
    productId: string,
    body: {
      isAvailable?: boolean;
      basePrice?: number;
      name?: string;
      description?: string;
      categoryName?: string;
    },
  ) {
    const current = await prisma.product.findUnique({ where: { id: productId } });
    if (!current) {
      throw new NotFoundException("Producto no encontrado");
    }

    const data: {
      isAvailable?: boolean;
      basePrice?: number;
      name?: string;
      description?: string | null;
      categoryId?: string;
    } = {};

    if (typeof body.isAvailable === "boolean") {
      data.isAvailable = body.isAvailable;
    }
    if (typeof body.basePrice === "number" && !Number.isNaN(body.basePrice)) {
      data.basePrice = Math.max(0, body.basePrice);
    }
    if (typeof body.name === "string" && body.name.trim().length > 0) {
      data.name = body.name.trim();
    }
    if (typeof body.description === "string") {
      data.description = body.description.trim() || null;
    }
    if (typeof body.categoryName === "string" && body.categoryName.trim().length > 0) {
      const catName = body.categoryName.trim();
      const tenantCategories = await prisma.category.findMany({
        where: { tenantId: current.tenantId },
      });
      let cat = tenantCategories.find(
        (c) => c.name.toLowerCase() === catName.toLowerCase(),
      );
      if (!cat) {
        cat = await prisma.category.create({
          data: {
            tenantId: current.tenantId,
            name: catName,
            sortOrder: tenantCategories.length + 1,
            isActive: true,
          },
        });
      }
      data.categoryId = cat.id;
    }

    return prisma.product.update({
      where: { id: productId },
      data,
    });
  }

  async addProductModifier(
    productId: string,
    body: { groupName?: string; optionName: string; priceDelta: number },
  ) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        modifiers: {
          include: { modifierGroup: { include: { options: true } } },
        },
      },
    });

    if (!product) {
      throw new NotFoundException("Producto no encontrado");
    }

    const cleanOptionName = (body.optionName || "").trim();
    if (!cleanOptionName) {
      throw new BadRequestException("El nombre de la adición es obligatorio");
    }

    const cleanGroupName = (body.groupName || "Adiciones").trim() || "Adiciones";
    const priceDelta = Math.max(0, Number(body.priceDelta) || 0);

    let link = product.modifiers.find(
      (pm) => pm.modifierGroup.name.toLowerCase() === cleanGroupName.toLowerCase(),
    );

    if (!link) {
      const createdGroup = await prisma.modifierGroup.create({
        data: {
          tenantId: product.tenantId,
          name: cleanGroupName,
          minSelect: 0,
          maxSelect: 5,
          options: {
            create: {
              name: cleanOptionName,
              priceDelta,
              isAvailable: true,
            },
          },
        },
        include: { options: true },
      });

      const createdLink = await prisma.productModifier.create({
        data: {
          productId: product.id,
          modifierGroupId: createdGroup.id,
          sortOrder: product.modifiers.length + 1,
        },
        include: { modifierGroup: { include: { options: true } } },
      });

      return createdLink.modifierGroup;
    }

    const createdOption = await prisma.modifierOption.create({
      data: {
        modifierGroupId: link.modifierGroup.id,
        name: cleanOptionName,
        priceDelta,
        isAvailable: true,
      },
    });

    return {
      ...link.modifierGroup,
      options: [...link.modifierGroup.options, createdOption],
    };
  }

  async deleteProduct(productId: string) {
    const existing = await prisma.product.findUnique({ where: { id: productId } });
    if (!existing) {
      throw new NotFoundException("Producto no encontrado");
    }
    await prisma.product.delete({ where: { id: productId } });
    return { deleted: true, id: productId };
  }
}
