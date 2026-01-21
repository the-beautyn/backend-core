import { forwardRef, Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { BrandService } from './brand.service';
import { BrandRepository } from './brand.repository';
import { BrandAccessGuard } from './guards/brand-access.guard';
import { SalonAccessGuard } from './guards/salon-access.guard';
import { SalonModule } from '../salon/salon.module';

@Module({
  imports: [SharedModule, forwardRef(() => SalonModule)],
  providers: [BrandService, BrandRepository, BrandAccessGuard, SalonAccessGuard],
  exports: [BrandService, BrandRepository, BrandAccessGuard, SalonAccessGuard],
})
export class BrandModule {}
