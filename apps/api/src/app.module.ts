import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { StorefrontModule } from './storefront/storefront.module.js';

@Module({
  imports: [StorefrontModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
