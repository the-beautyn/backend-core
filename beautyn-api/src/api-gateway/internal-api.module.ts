import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { CategoriesInternalController } from './v1/internal/categories.internal.controller';
import { ServicesModule } from '../services/services.module';
import { ServicesInternalController } from './v1/internal/services.internal.controller';
import { WorkersModule } from '../workers/workers.module';
import { WorkersInternalController } from './v1/internal/workers.internal.controller';

@Module({
  imports: [CategoriesModule, ServicesModule, WorkersModule],
  controllers: [CategoriesInternalController, ServicesInternalController, WorkersInternalController],
})
export class InternalApiModule {}
