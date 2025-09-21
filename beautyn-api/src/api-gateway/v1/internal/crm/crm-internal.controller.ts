import { Body, Controller, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CrmAdapterService } from '@crm/adapter';
import { CrmType } from '@crm/shared';
import { EnsureCronSyncDto } from './dto/ensure-cron-sync.dto';
import { InternalApiKeyGuard } from '../../../../shared/guards/internal-api-key.guard';

function envelope<T>(data: T) { return { success: true, data }; }

@Controller('api/v1/internal/crm')
@UseGuards(InternalApiKeyGuard)
export class CrmInternalController {
  constructor(private readonly adapter: CrmAdapterService) {}

  // @Post(':provider/:salonId/sync')
  // async requestSync(
  //   @Param('provider') provider: CrmType,
  //   @Param('salonId') salonId: string,
  // ) {
  //   const jobId = await this.adapter.requestSync(salonId, provider);
  //   return envelope({ jobId });
  // }

  // @Put(':provider/:salonId/cron')
  // async ensureCron(
  //   @Param('provider') provider: CrmType,
  //   @Param('salonId') salonId: string,
  //   @Body() dto: EnsureCronSyncDto,
  // ) {
  //   await this.adapter.ensureCronSync(salonId, provider, dto.cron, dto.tz);
  //   return envelope({ scheduled: true, cron: dto.cron, tz: dto.tz });
  // }
}

