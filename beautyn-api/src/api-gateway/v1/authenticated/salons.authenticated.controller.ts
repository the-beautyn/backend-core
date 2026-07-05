import { Controller, UseGuards, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiProperty } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { SalonService } from '../../../salon/salon.service';
import { envelopeArrayRef, envelopeRef } from '../../../shared/utils/swagger-envelope.util';
import { OwnerRolesGuard } from '../../../shared/guards/roles.guard';
import { CrmSalonChangeDto } from '../../../crm-salon-changes/dto/crm-salon-change.dto';
import { CrmSalonChangeMapper } from '../../../crm-salon-changes/mappers/crm-salon-change.mapper';
import { CrmIntegrationService } from '../../../crm-integration/core/crm-integration.service';
import { SalonAccessGuard } from '../../../brand/guards/salon-access.guard';

export class SyncSalonJobResponseDto {
  @ApiProperty() jobId!: string;
}

@ApiTags('Salons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/salon')
export class SalonsAuthenticatedController {
  constructor(
    private readonly salonService: SalonService,
    private readonly crmIntegration: CrmIntegrationService,
  ) {}

  @Post(':salonId/crm/sync')
  @ApiOperation({ summary: 'Pull salon from CRM and return new/pending changes' })
  @ApiOkResponse(envelopeArrayRef(CrmSalonChangeDto))
  @UseGuards(OwnerRolesGuard, SalonAccessGuard)
  async syncSalon(@Param('salonId') salonId: string) {
    const changes = await this.salonService.pullSalon(salonId);
    return changes.map(CrmSalonChangeMapper.toDto);
  }

  @Post(':salonId/crm/sync/async')
  @ApiOperation({ summary: 'Schedule async salon sync job' })
  @ApiOkResponse(envelopeRef(SyncSalonJobResponseDto))
  @UseGuards(OwnerRolesGuard, SalonAccessGuard)
  async syncSalonAsync(@Param('salonId') salonId: string) {
    const { jobId } = await this.crmIntegration.enqueueSalonSync(salonId);
    return { jobId };
  }
}
