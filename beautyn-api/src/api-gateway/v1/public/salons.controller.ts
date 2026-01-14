import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SalonService } from '../../../salon/salon.service';
import { SalonListQuery } from '../../../salon/dto/salon-list.query';
import { SalonListResponseDto } from '../../../salon/dto/salon-list.response.dto';
import { SalonDto } from '../../../salon/dto/salon.dto';
import { SalonImageDto } from '../../../salon/dto/salon-image.dto';
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
  async get(@Param('id') id: string, @Query('include') include?: string) {
    const salon = await this.salonService.findById(id, this.parseInclude(include));
    if (!salon) throw new NotFoundException('Salon not found');
    return salon;
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
