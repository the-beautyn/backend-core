import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch, Post, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppCategoriesService } from '../../../app-categories/app-categories.service';
import { CreateAppCategoryDto } from '../../../app-categories/dto/create-app-category.dto';
import { UpdateAppCategoryDto } from '../../../app-categories/dto/update-app-category.dto';
import { AppCategoryResponseDto } from '../../../app-categories/dto/app-category-response.dto';
import { envelopeRef } from '../../../shared/utils/swagger-envelope.util';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../../../shared/guards/roles.guard';

@ApiTags('App Categories')
@Controller('api/v1/app-categories')
export class AppCategoriesController {
  constructor(private readonly service: AppCategoriesService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @ApiOperation({ summary: 'Create app category (admin only)' })
  @ApiCreatedResponse(envelopeRef(AppCategoryResponseDto))
  async create(@Body() dto: CreateAppCategoryDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @ApiOperation({ summary: 'Update app category (admin only)' })
  @ApiOkResponse(envelopeRef(AppCategoryResponseDto))
  async update(@Param('id') id: string, @Body() dto: UpdateAppCategoryDto) {
    const updated = await this.service.update(id, dto);
    if (!updated) {
      throw new NotFoundException('App category not found');
    }
    return updated;
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @ApiOperation({ summary: 'Delete app category (admin only)' })
  @ApiNoContentResponse({ description: 'App category deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    const deleted = await this.service.delete(id);
    if (!deleted) {
      throw new NotFoundException('App category not found');
    }
  }
}
