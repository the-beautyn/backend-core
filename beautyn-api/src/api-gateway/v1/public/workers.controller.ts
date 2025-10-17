import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiNotFoundResponse, ApiParam } from '@nestjs/swagger';
import { WorkersService } from '../../../workers/workers.service';
import { WorkersListQuery } from '../../../workers/dto/workers-list.query';
import { envelopeErrorSchema, envelopeRef } from '../../../shared/utils/swagger-envelope.util';
import { PublicWorkerDto } from '../../../workers/dto/worker-public.dto';
import { PublicWorkersListResponseDto } from '../../../workers/dto/workers-public-list.response.dto';

@ApiTags('Workers')
@Controller('api/v1/workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get()
  @ApiOperation({ summary: 'List workers by salon with optional filters' })
  @ApiOkResponse(envelopeRef(PublicWorkersListResponseDto))
  list(@Query() query: WorkersListQuery) {
    return this.workersService.listPublic(query);
  }

  @Get('by-id/:id')
  @ApiOperation({ summary: 'Get worker by id' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse(envelopeRef(PublicWorkerDto))
  @ApiNotFoundResponse(envelopeErrorSchema({ statusCode: 404, message: 'Worker not found', error: 'Not Found' }))
  async getById(@Param('id') id: string) {
    const worker = await this.workersService.getPublicById(id);
    if (!worker) throw new NotFoundException('Worker not found');
    return worker;
  }
}
