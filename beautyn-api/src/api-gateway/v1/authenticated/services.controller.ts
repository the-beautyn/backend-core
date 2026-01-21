import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiAcceptedResponse, ApiBearerAuth, ApiConflictResponse, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ServicesService } from '../../../services/services.service';
import { OwnerServicesListQueryDto } from '../../../services/dto/owner-services-list.query';
import { ServicesListResponseDto } from '../../../services/dto/services-list.response.dto';
import { CrmServicePageDto } from '../../../services/dto/services-crm-page.dto';
import { ServicesSyncJobResponseDto, ServicesSyncResultDto } from '../../../services/dto/services-sync-result.dto';
import { CreateServiceDto } from '../../../services/dto/create-service.dto';
import { UpdateServiceDto } from '../../../services/dto/update-service.dto';
import { ServiceResponseDto } from '../../../services/dto/service-response.dto';
import { envelopeErrorSchema, envelopeRef } from '../../../shared/utils/swagger-envelope.util';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { OwnerRolesGuard } from '../../../shared/guards/roles.guard';
import { SalonAccessGuard } from '../../../brand/guards/salon-access.guard';

@ApiTags('Services')
@Controller('api/v1/salons/:salonId/services')
export class ServicesAuthenticatedController {
  constructor(private readonly services: ServicesService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard, SalonAccessGuard)
  @ApiOperation({ summary: 'Pull services from Beautyn database for the authenticated owner' })
  @ApiOkResponse(envelopeRef(ServicesListResponseDto))
  async pullFromDb(@Param('salonId') salonId: string, @Query() query: OwnerServicesListQueryDto) {
    return this.services.pullFromDb(salonId, query);
  }

  @Get('crm')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard, SalonAccessGuard)
  @ApiOperation({ summary: 'Pull services directly from connected CRM' })
  @ApiOkResponse(envelopeRef(CrmServicePageDto))
  async pullFromCrm(@Param('salonId') salonId: string) {
    const page = await this.services.pullFromCrm(salonId);
    return {
      items: page.items.map((item) => ({
        externalId: item.externalId,
        name: item.name,
        description: item.description ?? null,
        duration: item.duration,
        price: item.price,
        currency: item.currency,
        categoryExternalId: item.categoryExternalId ?? null,
        isActive: item.isActive ?? undefined,
        workerExternalIds: item.workerExternalIds ?? undefined,
        updatedAtIso: item.updatedAtIso ?? undefined,
      })),
      fetched: page.fetched,
      total: page.total,
      nextCursor: page.nextCursor,
    };
  }

  @Post('crm/sync')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard, SalonAccessGuard)
  @ApiOperation({ summary: 'Sync services from CRM into Beautyn database' })
  @ApiOkResponse(envelopeRef(ServicesSyncResultDto))
  async rebaseFromCrm(@Param('salonId') salonId: string) {
    return this.services.rebaseFromCrm(salonId);
  }

  @Post('crm/sync/async')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard, SalonAccessGuard)
  @ApiOperation({ summary: 'Schedule background services sync from CRM' })
  @ApiAcceptedResponse(envelopeRef(ServicesSyncJobResponseDto))
  @HttpCode(HttpStatus.ACCEPTED)
  async rebaseFromCrmAsync(@Param('salonId') salonId: string) {
    return this.services.rebaseFromCrmAsync(salonId);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard, SalonAccessGuard)
  @ApiOperation({ summary: 'Create a service in CRM and persist locally' })
  @ApiCreatedResponse(envelopeRef(ServiceResponseDto))
  @ApiConflictResponse(envelopeErrorSchema({ statusCode: 409, message: 'Service operation not supported', code: 'SERVICE_CRUD_NOT_SUPPORTED' }))
  async create(@Param('salonId') salonId: string, @Body() dto: CreateServiceDto) {
    return this.services.create(salonId, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard, SalonAccessGuard)
  @ApiOperation({ summary: 'Update a service in CRM and persist locally' })
  @ApiOkResponse(envelopeRef(ServiceResponseDto))
  @ApiConflictResponse(envelopeErrorSchema({ statusCode: 409, message: 'Service operation not supported', code: 'SERVICE_CRUD_NOT_SUPPORTED' }))
  async update(
    @Param('salonId') salonId: string,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.services.update(salonId, id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard, SalonAccessGuard)
  @ApiOperation({ summary: 'Delete a service in CRM and remove locally' })
  @ApiNoContentResponse({ description: 'Service deleted' })
  @ApiConflictResponse(envelopeErrorSchema({ statusCode: 409, message: 'Service operation not supported', code: 'SERVICE_CRUD_NOT_SUPPORTED' }))
  @HttpCode(204)
  async remove(@Param('salonId') salonId: string, @Param('id') id: string): Promise<void> {
    await this.services.delete(salonId, id);
  }
}
