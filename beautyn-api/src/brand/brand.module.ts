import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { BrandService } from './brand.service';
import { BrandRepository } from './brand.repository';
import { BrandAccessGuard } from './guards/brand-access.guard';
import { SalonAccessGuard } from './guards/salon-access.guard';
import { SalonModule } from '../salon/salon.module';
import { SyncSchedulerModule } from '@crm/sync-scheduler';

@Module({
  imports: [SharedModule, SalonModule, SyncSchedulerModule],
  providers: [BrandService, BrandRepository, BrandAccessGuard, SalonAccessGuard],
  exports: [BrandService, BrandRepository, BrandAccessGuard, SalonAccessGuard],
})
export class BrandModule {}
