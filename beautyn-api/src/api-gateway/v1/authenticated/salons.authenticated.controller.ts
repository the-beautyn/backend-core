import { Controller, Get, NotFoundException, ParseBoolPipe, Query, Req, UseGuards, Param, Post } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiProperty } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { SalonService } from '../../../salon/salon.service';
import { SalonDto } from '../../../salon/dto/salon.dto';
import { envelopeArrayRef, envelopeErrorSchema, envelopeRef } from '../../../shared/utils/swagger-envelope.util';
import { SearchHistoryService } from '../../../search/search-history.service';
import { createChildLogger } from '@shared/logger';
import { OwnerRolesGuard } from '../../../shared/guards/roles.guard';
import { CrmSalonChangeDto } from '../../../crm-salon-changes/dto/crm-salon-change.dto';
import { CrmSalonChangeMapper } from '../../../crm-salon-changes/mappers/crm-salon-change.mapper';
import { CrmIntegrationService } from '../../../crm-integration/core/crm-integration.service';
import { SalonAccessGuard } from '../../../brand/guards/salon-access.guard';

export class SyncSalonJobResponseDto {
  @ApiProperty() jobId!: string;
}

@ApiTags('Salons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/salon')
export class SalonsAuthenticatedController {
  private readonly log = createChildLogger('salons.controller');

  constructor(
    private readonly salonService: SalonService,
    private readonly searchHistoryService: SearchHistoryService,
    private readonly crmIntegration: CrmIntegrationService,
  ) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get salon by id' })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({
    name: 'include',
    required: false,
    description: 'Comma-separated list: services, workers, categories, images',
  })
  @ApiOkResponse(envelopeRef(SalonDto))
  @ApiBadRequestResponse(
    envelopeErrorSchema({ statusCode: 404, message: 'Not Found', error: 'Not Found' }),
  )
  async get(
    @Param('id') id: string,
    @Req() req: Request & { user?: { id: string } },
    @Query('isFromSearch', new ParseBoolPipe({ optional: true })) isFromSearch?: boolean,
    @Query('include') include?: string,
  ) {
    const salon = await this.salonService.findById(id, this.parseInclude(include));
    if (!salon) throw new NotFoundException('Salon not found');
    const userId = req?.user?.id;
    if (userId && isFromSearch) {
      this.searchHistoryService
        .addVisit(userId, id, null)
        .catch((err) =>
          this.log.warn('Failed to save search history visit', { err, userId, salonId: id }),
        );
    }
    return salon;
  }

  @Post(':salonId/crm/sync')
  @ApiOperation({ summary: 'Pull salon from CRM and return new/pending changes' })
  @ApiOkResponse(envelopeArrayRef(CrmSalonChangeDto))
  @UseGuards(OwnerRolesGuard, SalonAccessGuard)
  async syncSalon(@Param('salonId') salonId: string) {
    const changes = await this.salonService.pullSalon(salonId);
    return changes.map(CrmSalonChangeMapper.toDto);
  }

  @Post(':salonId/crm/sync/async')
  @ApiOperation({ summary: 'Schedule async salon sync job' })
  @ApiOkResponse(envelopeRef(SyncSalonJobResponseDto))
  @UseGuards(OwnerRolesGuard, SalonAccessGuard)
  async syncSalonAsync(@Param('salonId') salonId: string) {
    const { jobId } = await this.crmIntegration.enqueueSalonSync(salonId);
    return { jobId };
  }

  private parseInclude(include?: string) {
    if (!include) return undefined;
    const tokens = include
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    if (!tokens.length) return undefined;
    const set = new Set(tokens);
    return {
      services: set.has('services'),
      workers: set.has('workers'),
      categories: set.has('categories'),
      images: set.has('images'),
    };
  }
}
