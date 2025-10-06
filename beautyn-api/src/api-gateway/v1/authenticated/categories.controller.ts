import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
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
import { CategoryOwnerGuard } from '../../../categories/guards/category-owner.guard';
import type { Request } from 'express';

@ApiTags('Categories')
@Controller('api/v1/categories')
export class CategoriesAuthenticatedController {
  constructor(private readonly service: CategoriesService) {}

  @Get('my')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard)
  @ApiOperation({ summary: 'Pull categories from Beautyn database' })
  @ApiOkResponse(envelopeRef(CategoryListResponseDto))
  async pull(@Req() req: Request & { user: { id: string } }, @Query() query: OwnerListQueryDto) {
    return this.service.pullFromDb(req.user.id, query);
  }

  @Get('crm')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard)
  @ApiOperation({ summary: 'Pull categories directly from connected CRM' })
  @ApiOkResponse(envelopeRef(CrmCategoryPageDto))
  async pullFromCrm(@Req() req: Request & { user: { id: string } }) {
    const page = await this.service.pullFromCrm(req.user.id);
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
  @UseGuards(JwtAuthGuard, OwnerRolesGuard)
  @ApiOperation({ summary: 'Sync categories from CRM into Beautyn database' })
  @ApiOkResponse(envelopeRef(CategoriesSyncResultDto))
  async syncFromCrm(@Req() req: Request & { user: { id: string } }) {
    return this.service.rebaseFromCrm(req.user.id);
  }

  @Post('crm/sync/async')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard)
  @ApiOperation({ summary: 'Schedule background categories sync from CRM' })
  @ApiAcceptedResponse(envelopeRef(CategoriesSyncJobResponseDto))
  @HttpCode(HttpStatus.ACCEPTED)
  async syncFromCrmAsync(@Req() req: Request & { user: { id: string } }) {
    return this.service.rebaseFromCrmAsync(req.user.id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard)
  @ApiOperation({ summary: 'Create a category for the owner salon' })
  @ApiCreatedResponse(envelopeRef(CategoryResponseDto))
  @ApiConflictResponse(envelopeErrorSchema({ statusCode: 409, message: 'Category name already exists', code: 'CATEGORY_NAME_CONFLICT' }))
  async create(@Req() req: Request & { user: { id: string } }, @Body() dto: CreateCategoryDto) {
    return this.service.create(req.user.id, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard, CategoryOwnerGuard)
  @ApiOperation({ summary: 'Update a category in the owner salon' })
  @ApiOkResponse(envelopeRef(CategoryResponseDto))
  @ApiConflictResponse(envelopeErrorSchema({ statusCode: 409, message: 'Category has linked services', code: 'CATEGORY_HAS_SERVICES' }))
  async update(
    @Req() req: Request & { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.service.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard, CategoryOwnerGuard)
  @ApiOperation({ summary: 'Delete a category in the owner salon' })
  @ApiNoContentResponse({ description: 'Category deleted' })
  @HttpCode(204)
  async remove(@Req() req: Request & { user: { id: string } }, @Param('id') id: string): Promise<void> {
    await this.service.delete(req.user.id, id);
  }
}
