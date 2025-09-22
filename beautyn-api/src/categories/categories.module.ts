import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { CategoriesService } from './categories.service';
import { CategoriesRepository } from './repositories/categories.repo';
import { CategoryOwnerGuard } from './guards/category-owner.guard';
import { CrmAdapterModule } from '@crm/adapter';
import { CapabilityRegistryModule } from '@crm/capability-registry';
import { SyncSchedulerModule } from '@crm/sync-scheduler';

@Module({
  imports: [SharedModule, CrmAdapterModule, CapabilityRegistryModule, SyncSchedulerModule],
  providers: [CategoriesService, CategoriesRepository, CategoryOwnerGuard],
  exports: [CategoriesService, CategoriesRepository, CategoryOwnerGuard],
})
export class CategoriesModule {}

