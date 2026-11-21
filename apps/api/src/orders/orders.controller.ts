import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import type { CreateOrderDto, CreateTenantDto } from './orders.service.js';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('store/:slug/status')
  getStoreStatus(@Param('slug') slug: string) {
    return this.ordersService.getStoreStatus(slug);
  }

  @Patch('store/:slug/status')
  setStoreStatus(@Param('slug') slug: string, @Body('isOpen') isOpen: boolean) {
    return this.ordersService.setStoreStatus(slug, isOpen);
  }

  @Patch('store/:slug/config')
  updateStoreConfig(
    @Param('slug') slug: string,
    @Body() body: { name?: string; whatsappPhone?: string; primaryColor?: string },
  ) {
    return this.ordersService.updateStoreConfig(slug, body);
  }

  @Get('tenants')
  listTenants() {
    return this.ordersService.listTenants();
  }

  @Post('tenants')
  createTenant(@Body() dto: CreateTenantDto) {
    return this.ordersService.createTenant(dto);
  }

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(dto);
  }

  @Get()
  findAllRoot(@Query('slug') slug?: string) {
    return this.ordersService.listOrdersBySlug(slug || 'la-hamburgueseria');
  }

  @Get('catalog/:slug/products')
  getProducts(@Param('slug') slug: string) {
    return this.ordersService.listCatalogProducts(slug);
  }

  @Post('catalog/:slug/categories')
  createCategory(@Param('slug') slug: string, @Body('name') name: string) {
    return this.ordersService.createCategory(slug, name);
  }

  @Post('catalog/:slug/products')
  addProduct(
    @Param('slug') slug: string,
    @Body() body: { categoryName: string; name: string; description?: string; basePrice: number },
  ) {
    return this.ordersService.createQuickProduct(slug, body);
  }

  @Patch('catalog/products/:productId')
  updateProduct(
    @Param('productId') productId: string,
    @Body()
    body: {
      isAvailable?: boolean;
      basePrice?: number;
      name?: string;
      description?: string;
      categoryName?: string;
    },
  ) {
    return this.ordersService.updateProduct(productId, body);
  }

  @Delete('catalog/products/:productId')
  deleteProduct(@Param('productId') productId: string) {
    return this.ordersService.deleteProduct(productId);
  }

  @Get(':slug/track/:orderNumber')
  trackOrder(
    @Param('slug') slug: string,
    @Param('orderNumber') orderNumber: string,
  ) {
    return this.ordersService.trackOrder(slug, Number(orderNumber));
  }

  @Get(':slug')
  findAll(@Param('slug') slug: string) {
    return this.ordersService.listOrdersBySlug(slug);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.ordersService.updateOrderStatus(id, status);
  }
}
