import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { WorkersService } from '../../../workers/workers.service';
import type { WorkersSyncDto } from '../../../workers/dto/workers-sync.dto';
import { InternalApiKeyGuard } from '../../../shared/guards/internal-api-key.guard';

@Controller('api/v1/internal/workers')
export class WorkersInternalController {
  constructor(private readonly workersService: WorkersService) {}

  @ApiExcludeEndpoint()
  @Post('sync')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  sync(@Body() dto: WorkersSyncDto) {
    return this.workersService.syncFromCrm(dto);
  }
}
