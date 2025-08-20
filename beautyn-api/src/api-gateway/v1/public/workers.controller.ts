import { Controller, Get, Param, Query } from '@nestjs/common';
import { WorkersService } from '../../../workers/workers.service';
import { WorkersListQuery } from '../../../workers/dto/workers-list.query';
import { WorkerAvailabilityQuery } from '../../../workers/dto/worker-availability.query';

@Controller('api/v1/public/workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get()
  list(@Query() query: WorkersListQuery) {
    return this.workersService.list(query);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.workersService.getById(id, true);
  }

  @Get(':id/availability')
  availability(@Param('id') id: string, @Query() query: WorkerAvailabilityQuery) {
    return this.workersService.availability(id, query);
  }
}
