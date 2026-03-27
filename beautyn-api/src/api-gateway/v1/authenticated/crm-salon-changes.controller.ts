import { Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { OwnerRolesGuard } from '../../../shared/guards/roles.guard';
import { CrmSalonDiffService } from '../../../crm-salon-changes/crm-salon-diff.service';
import { BrandService } from '../../../brand/brand.service';
import { CrmSalonChangeDto } from '../../../crm-salon-changes/dto/crm-salon-change.dto';
import { CrmSalonChangeMapper } from '../../../crm-salon-changes/mappers/crm-salon-change.mapper';
import { GetCrmSalonChangesQuery } from '../../../crm-salon-changes/dto/get-crm-salon-changes.query';
import { envelopeArrayRef, envelopeErrorSchema } from '../../../shared/utils/swagger-envelope.util';

@ApiTags('CRM / Salon Changes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/crm/salon/changes')
export class CrmSalonChangesController {
  constructor(
    private readonly service: CrmSalonDiffService,
    private readonly brandService: BrandService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List detected CRM changes for a salon' })
  @ApiOkResponse(envelopeArrayRef(CrmSalonChangeDto))
  @ApiBadRequestResponse(envelopeErrorSchema())
  async list(
    @Req() req: Request & { user: { id: string } },
    @Query() query: GetCrmSalonChangesQuery,
  ) {
    await this.brandService.assertUserCanAccessSalon(req.user.id, query.salonId);
    const changes = await this.service.listChanges(query.salonId, query.status);
    return changes.map(CrmSalonChangeMapper.toDto);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept a pending CRM change' })
  @ApiOkResponse({ type: Object })
  @ApiBadRequestResponse(envelopeErrorSchema())
  @UseGuards(OwnerRolesGuard)
  async accept(
    @Req() req: Request & { user: { id: string } },
    @Param('id') id: string,
  ) {
    await this.service.acceptChange(id, req.user.id);
    return { id, status: 'accepted' };
  }

  @Post(':id/dismiss')
  @ApiOperation({ summary: 'Dismiss a pending CRM change' })
  @ApiOkResponse({ type: Object })
  @ApiBadRequestResponse(envelopeErrorSchema())
  @UseGuards(OwnerRolesGuard)
  async dismiss(
    @Req() req: Request & { user: { id: string } },
    @Param('id') id: string,
  ) {
    await this.service.dismissChange(id, req.user.id);
    return { id, status: 'dismissed' };
  }
}
