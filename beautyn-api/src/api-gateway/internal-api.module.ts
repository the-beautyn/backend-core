import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { CategoriesInternalController } from './v1/internal/categories.internal.controller';

@Module({
  imports: [CategoriesModule],
  controllers: [CategoriesInternalController],
})
export class InternalApiModule {}


