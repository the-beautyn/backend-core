import { Controller, Get, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ServicesService } from '../../../services/services.service';
import { ServicesListQuery } from '../../../services/dto/services-list.query';
import { ServicesListResponseDto } from '../../../services/dto/services-list.response.dto';
import { envelopeErrorSchema, envelopeRef } from '../../../shared/utils/swagger-envelope.util';

@ApiTags('Services')
@Controller('api/v1/services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @ApiOperation({ summary: 'List services with filtering and pagination' })
  @ApiOkResponse(envelopeRef(ServicesListResponseDto))
  @ApiBadRequestResponse(
    envelopeErrorSchema({ statusCode: 400, message: 'Bad Request', error: 'Bad Request' }),
  )
  async list(@Query() query: ServicesListQuery) {
    return this.servicesService.listPublic(query);
  }
}
