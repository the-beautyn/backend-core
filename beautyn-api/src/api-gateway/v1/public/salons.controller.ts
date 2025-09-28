import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SalonService } from '../../../salon/salon.service';
import { SalonListQuery } from '../../../salon/dto/salon-list.query';
import { SalonListResponseDto } from '../../../salon/dto/salon-list.response.dto';
import { SalonDto } from '../../../salon/dto/salon.dto';
import { SalonImageDto } from '../../../salon/dto/salon-image.dto';
import { envelopeErrorSchema, envelopeArrayRef, envelopeRef } from '../../../shared/utils/swagger-envelope.util';

@ApiTags('Salons')
@Controller('api/v1/salons')
export class SalonsController {
  constructor(private readonly salonService: SalonService) {}

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
  @ApiOkResponse(envelopeRef(SalonDto))
  @ApiBadRequestResponse(
    envelopeErrorSchema({ statusCode: 404, message: 'Not Found', error: 'Not Found' }),
  )
  async get(@Param('id') id: string) {
    const salon = await this.salonService.findById(id);
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
}
