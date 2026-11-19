import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CartItemInput } from '@repo/pricing';
import { StorefrontService } from './storefront.service.js';

@Controller('storefront')
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Get(':slug')
  getCatalog(@Param('slug') slug: string) {
    return this.storefrontService.getTenantCatalog(slug);
  }

  @Post('quote')
  quote(@Body('items') items: CartItemInput[] = []) {
    return this.storefrontService.quoteOrder(items);
  }
}
