import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { CategoriesService } from './categories.service';
import { CategoriesRepository } from './repositories/categories.repo';
import { CategoryOwnerGuard } from './guards/category-owner.guard';
import { CrmIntegrationModule } from '../crm-integration/core/crm-integration.module';
import { CapabilityRegistryModule } from '@crm/capability-registry';
import { AppCategoriesModule } from '../app-categories/app-categories.module';

@Module({
  imports: [SharedModule, CrmIntegrationModule, CapabilityRegistryModule, AppCategoriesModule],
  providers: [CategoriesService, CategoriesRepository, CategoryOwnerGuard],
  exports: [CategoriesService, CategoriesRepository, CategoryOwnerGuard],
})
export class CategoriesModule {}
