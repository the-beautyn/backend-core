import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController, ApiExcludeEndpoint } from '@nestjs/swagger';
import { CategoriesService } from '../../../categories/categories.service';
import { InternalApiKeyGuard } from '../../../shared/guards/internal-api-key.guard';
import { CategoriesSyncDto } from '../../../categories/dto/categories-sync.dto';
import { runWithRequestContext, createChildLogger } from '@shared/logger';

const log = createChildLogger('categories.internal');

@ApiExcludeController()
@Controller('api/v1/internal/categories')
export class CategoriesInternalController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @ApiExcludeEndpoint()
  @Post('sync')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async sync(@Body() dto: CategoriesSyncDto) {
    return this.categoriesService.syncFromCrm(dto);
  }
}

