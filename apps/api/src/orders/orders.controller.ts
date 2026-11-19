import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateOrderDto, OrdersService } from './orders.service.js';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(dto);
  }

  @Get(':slug')
  findAll(@Param('slug') slug: string) {
    return this.ordersService.listOrdersBySlug(slug);
  }
}
