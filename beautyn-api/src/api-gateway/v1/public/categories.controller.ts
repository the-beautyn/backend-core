import { Controller, Get, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from '../../../categories/categories.service';
import { ListQueryDto } from '../../../categories/dto/list-query.dto';
import { CategoryListResponseDto } from '../../../categories/dto/category-response.dto';
import { envelopeErrorSchema, envelopeRef } from '../../../shared/utils/swagger-envelope.util';

@ApiTags('Categories')
@Controller('api/v1/categories')
export class CategoriesPublicController {
  constructor(private readonly service: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List categories for a salon (public)' })
  @ApiOkResponse(envelopeRef(CategoryListResponseDto))
  @ApiBadRequestResponse(envelopeErrorSchema())
  async list(@Query() query: ListQueryDto) {
    return this.service.listPublic(query);
  }
}
