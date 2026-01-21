import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiAcceptedResponse, ApiBearerAuth, ApiConflictResponse, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from '../../../categories/categories.service';
import { OwnerListQueryDto } from '../../../categories/dto/list-query.dto';
import { CategoryListResponseDto, CategoryResponseDto } from '../../../categories/dto/category-response.dto';
import { CreateCategoryDto } from '../../../categories/dto/create-category.dto';
import { UpdateCategoryDto } from '../../../categories/dto/update-category.dto';
import { CrmCategoryPageDto, CategoriesSyncJobResponseDto, CategoriesSyncResultDto } from '../../../categories/dto/categories-sync-result.dto';
import { envelopeErrorSchema, envelopeRef } from '../../../shared/utils/swagger-envelope.util';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { OwnerRolesGuard } from '../../../shared/guards/roles.guard';
import { SalonAccessGuard } from '../../../brand/guards/salon-access.guard';

@ApiTags('Categories')
@Controller('api/v1/salons/:salonId/categories')
export class CategoriesAuthenticatedController {
  constructor(private readonly service: CategoriesService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard, SalonAccessGuard)
  @ApiOperation({ summary: 'Pull categories from Beautyn database' })
  @ApiOkResponse(envelopeRef(CategoryListResponseDto))
  async pull(
    @Param('salonId') salonId: string,
    @Query() query: OwnerListQueryDto,
  ) {
    return this.service.pullFromDb(salonId, query);
  }

  @Get('crm')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard, SalonAccessGuard)
  @ApiOperation({ summary: 'Pull categories directly from connected CRM' })
  @ApiOkResponse(envelopeRef(CrmCategoryPageDto))
  async pullFromCrm(@Param('salonId') salonId: string) {
    const page = await this.service.pullFromCrm(salonId);
    return {
      items: page.items.map((item) => ({
        externalId: item.externalId,
        name: item.name,
        parentExternalId: item.parentExternalId ?? null,
        color: item.color ?? null,
        sortOrder: item.sortOrder ?? null,
        isActive: item.isActive ?? undefined,
        updatedAtIso: item.updatedAtIso ?? undefined,
      })),
      fetched: page.fetched,
      total: page.total,
      nextCursor: page.nextCursor,
    };
  }

  @Post('crm/sync')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard, SalonAccessGuard)
  @ApiOperation({ summary: 'Sync categories from CRM into Beautyn database' })
  @ApiOkResponse(envelopeRef(CategoriesSyncResultDto))
  async syncFromCrm(@Param('salonId') salonId: string) {
    return this.service.rebaseFromCrm(salonId);
  }

  @Post('crm/sync/async')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard, SalonAccessGuard)
  @ApiOperation({ summary: 'Schedule background categories sync from CRM' })
  @ApiAcceptedResponse(envelopeRef(CategoriesSyncJobResponseDto))
  @HttpCode(HttpStatus.ACCEPTED)
  async syncFromCrmAsync(@Param('salonId') salonId: string) {
    return this.service.rebaseFromCrmAsync(salonId);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard, SalonAccessGuard)
  @ApiOperation({ summary: 'Create a category for the owner salon' })
  @ApiCreatedResponse(envelopeRef(CategoryResponseDto))
  @ApiConflictResponse(envelopeErrorSchema({ statusCode: 409, message: 'Category name already exists', code: 'CATEGORY_NAME_CONFLICT' }))
  async create(@Param('salonId') salonId: string, @Body() dto: CreateCategoryDto) {
    return this.service.create(salonId, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard, SalonAccessGuard)
  @ApiOperation({ summary: 'Update a category in the owner salon' })
  @ApiOkResponse(envelopeRef(CategoryResponseDto))
  @ApiConflictResponse(envelopeErrorSchema({ statusCode: 409, message: 'Category has linked services', code: 'CATEGORY_HAS_SERVICES' }))
  async update(
    @Param('salonId') salonId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.service.update(salonId, id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard, SalonAccessGuard)
  @ApiOperation({ summary: 'Delete a category in the owner salon' })
  @ApiNoContentResponse({ description: 'Category deleted' })
  @HttpCode(204)
  async remove(@Param('salonId') salonId: string, @Param('id') id: string): Promise<void> {
    await this.service.delete(salonId, id);
  }
}
