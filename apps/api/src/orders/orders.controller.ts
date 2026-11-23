import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import type { CreateOrderDto, CreateTenantDto } from './orders.service.js';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('store/:slug/status')
  getStoreStatus(@Param('slug') slug: string) {
    return this.ordersService.getStoreStatus(slug);
  }

  @Post('store/:slug/verify-pin')
  verifyStorePin(@Param('slug') slug: string, @Body('pin') pin: string) {
    return this.ordersService.verifyStorePin(slug, pin);
  }

  @Patch('store/:slug/status')
  setStoreStatus(
    @Param('slug') slug: string,
    @Body('isOpen') isOpen: boolean,
    @Headers('x-admin-pin') adminPin?: string,
  ) {
    return this.ordersService.setStoreStatus(slug, isOpen, adminPin);
  }

  @Patch('store/:slug/config')
  updateStoreConfig(
    @Param('slug') slug: string,
    @Body() body: { name?: string; whatsappPhone?: string; primaryColor?: string; adminPin?: string },
    @Headers('x-admin-pin') adminPin?: string,
  ) {
    return this.ordersService.updateStoreConfig(slug, body, adminPin);
  }

  @Get('health')
  health() {
    return { status: "ok", timestamp: new Date().toISOString() };
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
  createCategory(
    @Param('slug') slug: string,
    @Body('name') name: string,
    @Headers('x-admin-pin') adminPin?: string,
  ) {
    return this.ordersService.createCategory(slug, name, adminPin);
  }

  @Post('catalog/:slug/products')
  addProduct(
    @Param('slug') slug: string,
    @Body() body: { categoryName: string; name: string; description?: string; basePrice: number },
    @Headers('x-admin-pin') adminPin?: string,
  ) {
    return this.ordersService.createQuickProduct(slug, body, adminPin);
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
    @Headers('x-admin-pin') adminPin?: string,
  ) {
    return this.ordersService.updateProduct(productId, body, adminPin);
  }

  @Post('catalog/products/:productId/modifiers')
  addProductModifier(
    @Param('productId') productId: string,
    @Body() body: { groupName?: string; optionName: string; priceDelta: number },
    @Headers('x-admin-pin') adminPin?: string,
  ) {
    return this.ordersService.addProductModifier(productId, body, adminPin);
  }

  @Delete('catalog/products/:productId')
  deleteProduct(
    @Param('productId') productId: string,
    @Headers('x-admin-pin') adminPin?: string,
  ) {
    return this.ordersService.deleteProduct(productId, adminPin);
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
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Headers('x-admin-pin') adminPin?: string,
  ) {
    return this.ordersService.updateOrderStatus(id, status, adminPin);
  }
}
