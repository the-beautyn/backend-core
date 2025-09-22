import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiConflictResponse, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from '../../../categories/categories.service';
import { OwnerListQueryDto } from '../../../categories/dto/list-query.dto';
import { CategoryListResponseDto, CategoryResponseDto } from '../../../categories/dto/category-response.dto';
import { CreateCategoryDto } from '../../../categories/dto/create-category.dto';
import { UpdateCategoryDto } from '../../../categories/dto/update-category.dto';
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
  @ApiOperation({ summary: 'List categories for the authenticated owner' })
  @ApiOkResponse(envelopeRef(CategoryListResponseDto))
  async listMine(@Req() req: Request & { user: { id: string } }, @Query() query: OwnerListQueryDto) {
    return this.service.listForOwner(req.user.id, query);
  }

  @Get('crm')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard)
  @ApiOperation({ summary: 'List categories for the authenticated owner' })
  @ApiOkResponse(envelopeRef(CategoryListResponseDto))
  async listCrmMine(@Req() req: Request & { user: { id: string } }) {
    return this.service.pullFromCrm(req.user.id);
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
