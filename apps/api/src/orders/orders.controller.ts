import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateOrderDto, OrdersService } from './orders.service.js';

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
}
