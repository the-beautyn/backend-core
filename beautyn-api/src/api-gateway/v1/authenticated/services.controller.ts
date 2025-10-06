import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiAcceptedResponse, ApiBearerAuth, ApiConflictResponse, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
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

@ApiTags('Services')
@Controller('api/v1/services')
export class ServicesAuthenticatedController {
  constructor(private readonly services: ServicesService) {}

  @Get('my')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard)
  @ApiOperation({ summary: 'Pull services from Beautyn database for the authenticated owner' })
  @ApiOkResponse(envelopeRef(ServicesListResponseDto))
  async pullFromDb(@Req() req: Request & { user: { id: string } }, @Query() query: OwnerServicesListQueryDto) {
    return this.services.pullFromDb(req.user.id, query);
  }

  @Get('crm')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard)
  @ApiOperation({ summary: 'Pull services directly from connected CRM' })
  @ApiOkResponse(envelopeRef(CrmServicePageDto))
  async pullFromCrm(@Req() req: Request & { user: { id: string } }) {
    const page = await this.services.pullFromCrm(req.user.id);
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
  @UseGuards(JwtAuthGuard, OwnerRolesGuard)
  @ApiOperation({ summary: 'Sync services from CRM into Beautyn database' })
  @ApiOkResponse(envelopeRef(ServicesSyncResultDto))
  async rebaseFromCrm(@Req() req: Request & { user: { id: string } }) {
    return this.services.rebaseFromCrm(req.user.id);
  }

  @Post('crm/sync/async')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard)
  @ApiOperation({ summary: 'Schedule background services sync from CRM' })
  @ApiAcceptedResponse(envelopeRef(ServicesSyncJobResponseDto))
  @HttpCode(HttpStatus.ACCEPTED)
  async rebaseFromCrmAsync(@Req() req: Request & { user: { id: string } }) {
    return this.services.rebaseFromCrmAsync(req.user.id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard)
  @ApiOperation({ summary: 'Create a service in CRM and persist locally' })
  @ApiCreatedResponse(envelopeRef(ServiceResponseDto))
  @ApiConflictResponse(envelopeErrorSchema({ statusCode: 409, message: 'Service operation not supported', code: 'SERVICE_CRUD_NOT_SUPPORTED' }))
  async create(@Req() req: Request & { user: { id: string } }, @Body() dto: CreateServiceDto) {
    return this.services.create(req.user.id, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard)
  @ApiOperation({ summary: 'Update a service in CRM and persist locally' })
  @ApiOkResponse(envelopeRef(ServiceResponseDto))
  @ApiConflictResponse(envelopeErrorSchema({ statusCode: 409, message: 'Service operation not supported', code: 'SERVICE_CRUD_NOT_SUPPORTED' }))
  async update(
    @Req() req: Request & { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.services.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard)
  @ApiOperation({ summary: 'Delete a service in CRM and remove locally' })
  @ApiNoContentResponse({ description: 'Service deleted' })
  @ApiConflictResponse(envelopeErrorSchema({ statusCode: 409, message: 'Service operation not supported', code: 'SERVICE_CRUD_NOT_SUPPORTED' }))
  @HttpCode(204)
  async remove(@Req() req: Request & { user: { id: string } }, @Param('id') id: string): Promise<void> {
    await this.services.delete(req.user.id, id);
  }
}
