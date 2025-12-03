import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { OwnerRolesGuard } from '../../../shared/guards/roles.guard';
import { CategoryOwnerGuard } from '../../../categories/guards/category-owner.guard';
import { UpdateSalonCategoryMappingDto } from '../../../app-categories/dto/update-salon-category-mapping.dto';
import { SalonCategoryMappingResponseDto } from '../../../app-categories/dto/salon-category-mapping-response.dto';
import { envelopeRef } from '../../../shared/utils/swagger-envelope.util';
import { SalonCategoryMappingsService } from '../../../app-categories/salon-category-mappings.service';

@ApiTags('App Categories')
@Controller('api/v1/app-categories/mappings')
export class AppCategoryMappingsController {
  constructor(private readonly mappings: SalonCategoryMappingsService) {}

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard, CategoryOwnerGuard)
  @ApiOperation({ summary: 'Get mapping for a salon category (owner)' })
  @ApiOkResponse(envelopeRef(SalonCategoryMappingResponseDto))
  async getMapping(@Param('id') id: string) {
    return this.mappings.find(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard, CategoryOwnerGuard)
  @ApiOperation({ summary: 'Assign/override mapping to an app category (owner)' })
  @ApiOkResponse(envelopeRef(SalonCategoryMappingResponseDto))
  async upsertMapping(@Param('id') id: string, @Body() dto: UpdateSalonCategoryMappingDto): Promise<SalonCategoryMappingResponseDto> {
    return this.mappings.upsert(id, dto, 'owner');
  }
}
