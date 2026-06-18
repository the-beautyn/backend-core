import { Controller, Get, Param, Query, Req, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { SalonService } from '../../../salon/salon.service';
import { SalonListQuery } from '../../../salon/dto/salon-list.query';
import { SalonListResponseDto } from '../../../salon/dto/salon-list.response.dto';
import { SalonDto } from '../../../salon/dto/salon.dto';
import { SalonShareDto } from '../../../salon/dto/salon-share.dto';
import { SalonImageDto } from '../../../salon/dto/salon-image.dto';
import { OptionalJwtAuthGuard } from '../../../shared/guards/optional-jwt-auth.guard';
import { envelopeErrorSchema, envelopeArrayRef, envelopeRef } from '../../../shared/utils/swagger-envelope.util';
import { SearchHistoryService } from '../../../search/search-history.service';
import { createChildLogger } from '@shared/logger';

@ApiTags('Salons')
@Controller('api/v1/salons')
export class SalonsController {
  private readonly log = createChildLogger('salons.controller');

  constructor(
    private readonly salonService: SalonService,
    private readonly searchHistoryService: SearchHistoryService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List salons with filters and pagination' })
  @ApiOkResponse(envelopeRef(SalonListResponseDto))
  @ApiBadRequestResponse(
    envelopeErrorSchema({ statusCode: 400, message: 'Bad Request', error: 'Bad Request' }),
  )
  list(@Query() query: SalonListQuery) {
    return this.salonService.list(query);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Get salon by id',
    description:
      'Public endpoint. When called with a valid bearer token, the response includes ' +
      '`is_saved` indicating whether the authenticated user has the salon in their saved list.',
  })
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
    @Req() req: Request & { user?: { id?: string } | null },
    @Query('include') include?: string,
  ) {
    const userId = req.user?.id ?? null;
    const salon = await this.salonService.findById(id, this.parseInclude(include), userId);
    if (!salon) throw new NotFoundException('Salon not found');
    return salon;
  }

  @Get(':id/share')
  @ApiOperation({
    summary: 'Get a shareable URL and metadata for a salon',
    description:
      'Returns a deterministic deep-link URL plus OG-style metadata (title, description, image_url) ' +
      'suitable for native share sheets and web link previews.',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse(envelopeRef(SalonShareDto))
  @ApiBadRequestResponse(
    envelopeErrorSchema({ statusCode: 404, message: 'Not Found', error: 'Not Found' }),
  )
  async share(@Param('id') id: string): Promise<SalonShareDto> {
    return this.salonService.getShare(id);
  }

  @Get(':id/images')
  @ApiOperation({ summary: 'List images for a salon' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse(envelopeArrayRef(SalonImageDto))
  @ApiBadRequestResponse(
    envelopeErrorSchema({ statusCode: 404, message: 'Not Found', error: 'Not Found' }),
  )
  async images(@Param('id') id: string) {
    const salon = await this.salonService.findById(id);
    if (!salon) throw new NotFoundException('Salon not found');
    return this.salonService.listImages(id);
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
