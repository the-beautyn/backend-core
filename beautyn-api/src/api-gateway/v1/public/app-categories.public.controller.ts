import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppCategoriesService } from '../../../app-categories/app-categories.service';
import { ListAppCategoriesQueryDto } from '../../../app-categories/dto/list-app-categories.dto';
import { AppCategoryListResponseDto } from '../../../app-categories/dto/app-category-list-response.dto';
import { envelopeRef } from '../../../shared/utils/swagger-envelope.util';

@ApiTags('App Categories')
@Controller('api/v1/app-categories')
export class AppCategoriesPublicController {
  constructor(private readonly service: AppCategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List app categories (public)' })
  @ApiOkResponse(envelopeRef(AppCategoryListResponseDto))
  async list(@Query() query: ListAppCategoriesQueryDto) {
    return this.service.list(query);
  }
}
