import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import type { CreateOrderDto } from './orders.service.js';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(dto);
  }

  @Get()
  findAllRoot(@Query('slug') slug?: string) {
    return this.ordersService.listOrdersBySlug(slug || 'la-hamburgueseria');
  }

  @Get(':slug')
  findAll(@Param('slug') slug: string) {
    return this.ordersService.listOrdersBySlug(slug);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.ordersService.updateOrderStatus(id, status);
  }

  @Post('catalog/:slug/products')
  addProduct(
    @Param('slug') slug: string,
    @Body() body: { categoryName: string; name: string; description?: string; basePrice: number },
  ) {
    return this.ordersService.createQuickProduct(slug, body);
  }
}
