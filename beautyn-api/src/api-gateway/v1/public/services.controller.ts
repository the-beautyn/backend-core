import { Controller, Get, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ServicesService } from '../../../services/services.service';
import { ServicesListQuery } from '../../../services/dto/services-list.query';
import { ServicesListResponseDto } from '../../../services/dto/services-list.response.dto';
import { CategoryDto } from '../../../services/dto/category.dto';
import { envelopeArrayRef, envelopeErrorSchema, envelopeRef } from '../../../shared/utils/swagger-envelope.util';

@ApiTags('Services')
@Controller('api/v1/public')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get('services')
  @ApiOperation({ summary: 'List services with filtering and pagination' })
  @ApiOkResponse(envelopeRef(ServicesListResponseDto))
  @ApiBadRequestResponse(
    envelopeErrorSchema({ statusCode: 400, message: 'Bad Request', error: 'Bad Request' }),
  )
  async list(@Query() query: ServicesListQuery) {
    return this.servicesService.list(query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List service categories for a salon' })
  @ApiQuery({ name: 'salon_id', type: String, required: true })
  @ApiOkResponse(envelopeArrayRef(CategoryDto))
  @ApiBadRequestResponse(
    envelopeErrorSchema({ statusCode: 400, message: 'Bad Request', error: 'Bad Request' }),
  )
  async categories(@Query('salon_id') salonId: string) {
    return this.servicesService.listCategories(salonId);
  }
}