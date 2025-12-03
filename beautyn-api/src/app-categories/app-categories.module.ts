import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { AppCategoriesService } from './app-categories.service';
import { AppCategoriesRepository } from './repositories/app-categories.repo';
import { SalonCategoryMappingsService } from './salon-category-mappings.service';
import { SalonCategoryMappingsRepository } from './repositories/salon-category-mappings.repo';

@Module({
  imports: [SharedModule],
  providers: [AppCategoriesService, AppCategoriesRepository, SalonCategoryMappingsService, SalonCategoryMappingsRepository],
  exports: [AppCategoriesService, AppCategoriesRepository, SalonCategoryMappingsService, SalonCategoryMappingsRepository],
})
export class AppCategoriesModule {}
