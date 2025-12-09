import { Body, Controller, Get, Param, Patch, Query, UseGuards, ForbiddenException, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { AdminRolesGuard, OwnerRolesGuard } from '../../../shared/guards/roles.guard';
import { CategoryOwnerGuard } from '../../../categories/guards/category-owner.guard';
import { UpdateSalonCategoryMappingDto } from '../../../app-categories/dto/update-salon-category-mapping.dto';
import { SalonAppCategoryMappingDto, SalonCategoryMappingResponseDto } from '../../../app-categories/dto/salon-category-mapping-response.dto';
import { envelopeArrayRef, envelopeRef } from '../../../shared/utils/swagger-envelope.util';
import { SalonCategoryMappingsService } from '../../../app-categories/salon-category-mappings.service';
import { PrismaService } from '../../../shared/database/prisma.service';
import { createChildLogger } from '@shared/logger';

@ApiTags('App Categories')
@Controller('api/v1/app-categories/mappings')
export class AppCategoryMappingsController {
  constructor(
    private readonly mappings: SalonCategoryMappingsService,
    private readonly prisma: PrismaService,
  ) {}

  log = createChildLogger('AppCategoryMappingsController');

  @Get('admin/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @ApiOperation({ summary: 'Get mapping for a salon (admin only)' })
  @ApiOkResponse(envelopeRef(SalonCategoryMappingResponseDto))
  async getMapping(@Param('id') id: string) {
    this.log.info('Getting mapping for a salon category', { id });
    return this.mappings.listBySalonIds([id]);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard)
  @ApiOperation({ summary: 'Get mapping for an owner (only their salons)' })
  @ApiOkResponse(envelopeRef(SalonCategoryMappingResponseDto))
  async getMappingForOwner(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    const owned = await (this.prisma as any).salon.findMany({
      where: { ownerUserId: user?.id, deletedAt: null },
      select: { id: true },
    });
    const ids = owned.map((s: any) => s.id);
    if (!ids.includes(id)) {
      throw new ForbiddenException('You do not own this salon');
    } else {
      return this.mappings.listBySalonIds([id]);
    }
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
