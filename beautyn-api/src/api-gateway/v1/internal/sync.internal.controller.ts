import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { InternalApiKeyGuard } from '../../../shared/guards/internal-api-key.guard';
import { SyncDispatchDto } from '../../../booking/dto/sync-dispatch.dto';
import { CrmIntegrationService } from '../../../crm-integration/core/crm-integration.service';

@ApiExcludeController()
@Controller('api/v1/internal/sync')
export class SyncInternalController {
  constructor(private readonly crmIntegration: CrmIntegrationService) {}

  // Cron-only: fan a lane tick out across all active CRM salons. Not owner-reachable.
  // Fast = bookings only; slow = bookings + catalog (categories/services/workers/salon).
  @Post('dispatch')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async dispatch(@Body() dto: SyncDispatchDto): Promise<{ enqueued: number; catalog: number; total: number }> {
    return this.crmIntegration.dispatchLane(dto.lane);
  }
}
