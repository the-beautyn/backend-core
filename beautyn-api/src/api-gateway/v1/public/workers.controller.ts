import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiNotFoundResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { WorkersService } from '../../../workers/workers.service';
import { WorkersListQuery } from '../../../workers/dto/workers-list.query';
import { WorkerAvailabilityQuery } from '../../../workers/dto/worker-availability.query';
import { WorkerDto } from '../../../workers/dto/worker.dto';
import { envelopeArrayRef, envelopeErrorSchema, envelopeRef } from '../../../shared/utils/swagger-envelope.util';
import { WorkerAvailabilityResponseDto } from '../../../workers/dto/worker-availability-response.dto';

@ApiTags('Workers')
@Controller('api/v1/workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get()
  @ApiOperation({ summary: 'List workers by salon with optional filters' })
  @ApiQuery({ name: 'salon_id', required: true, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Search by first or last name' })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiOkResponse(envelopeArrayRef(WorkerDto))
  list(@Query() query: WorkersListQuery) {
    return this.workersService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get worker by id' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse(envelopeRef(WorkerDto))
  @ApiNotFoundResponse(envelopeErrorSchema({ statusCode: 404, message: 'Worker not found', error: 'Not Found' }))
  async getById(@Param('id') id: string) {
    const worker = await this.workersService.getById(id, true);
    if (!worker) throw new NotFoundException('Worker not found');
    return worker;
  }

  @Get(':id/availability')
  @ApiOperation({ summary: 'Get worker availability for a given date' })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'date', required: true, type: String, description: 'ISO date, e.g. 2025-08-20' })
  @ApiOkResponse(envelopeRef(WorkerAvailabilityResponseDto))
  availability(@Param('id') id: string, @Query() query: WorkerAvailabilityQuery) {
    return this.workersService.availability(id, query);
  }
}
