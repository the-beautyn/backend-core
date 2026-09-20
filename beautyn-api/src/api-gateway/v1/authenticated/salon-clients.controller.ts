import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SalonClientsService } from '../../../salon-clients/salon-clients.service';
import { OwnerClientsListQueryDto } from '../../../salon-clients/dto/owner-clients-list.query';
import { SalonClientDto } from '../../../salon-clients/dto/salon-client.dto';
import { SalonClientsListResponseDto } from '../../../salon-clients/dto/salon-clients-list.response.dto';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { OwnerRolesGuard } from '../../../shared/guards/roles.guard';
import { SalonAccessGuard } from '../../../brand/guards/salon-access.guard';
import { envelopeErrorSchema, envelopeRef } from '../../../shared/utils/swagger-envelope.util';

@ApiTags('Salon Clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OwnerRolesGuard, SalonAccessGuard)
@Controller('api/v1/salons/:salonId/clients')
export class SalonClientsController {
  constructor(private readonly clients: SalonClientsService) {}

  @Get()
  @ApiOperation({ summary: 'List the salon’s clients with bookings count and last visit' })
  @ApiOkResponse(envelopeRef(SalonClientsListResponseDto))
  list(
    @Param('salonId', new ParseUUIDPipe()) salonId: string,
    @Query() query: OwnerClientsListQueryDto,
  ): Promise<SalonClientsListResponseDto> {
    return this.clients.list(salonId, query);
  }

  @Get(':clientId')
  @ApiOperation({ summary: 'Get one salon client' })
  @ApiOkResponse(envelopeRef(SalonClientDto))
  @ApiNotFoundResponse(envelopeErrorSchema({ statusCode: 404, message: 'Client not found', error: 'Not Found' }))
  get(
    @Param('salonId', new ParseUUIDPipe()) salonId: string,
    @Param('clientId', new ParseUUIDPipe()) clientId: string,
  ): Promise<SalonClientDto> {
    return this.clients.get(salonId, clientId);
  }
}
