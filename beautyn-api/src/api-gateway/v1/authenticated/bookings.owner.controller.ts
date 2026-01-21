import { Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiProperty } from '@nestjs/swagger';
import type { Request } from 'express';
import { BookingQueryService } from '../../../booking/booking-query.service';
import {
  BookingDto,
  BookingListResponseDto,
  BookingListResponseDtoClass,
  BookingResponseDto,
} from '../../../booking/dto/booking.response.dto';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { OwnerRolesGuard } from '../../../shared/guards/roles.guard';
import { SalonAccessGuard } from '../../../brand/guards/salon-access.guard';
import { BookingSyncService } from '../../../booking/booking-sync.service';
import { CrmIntegrationService } from '../../../crm-integration/core/crm-integration.service';
import { CrmType } from '@crm/shared';
import { envelopeArrayRef, envelopeRef } from '../../../shared/utils/swagger-envelope.util';
import { createChildLogger } from '@shared/logger';

export class SyncBookingsNowResponseDto {
  @ApiProperty() synced!: number;
}

export class SyncBookingsJobResponseDto {
  @ApiProperty() jobId!: string;
}

@ApiTags('Salon Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OwnerRolesGuard, SalonAccessGuard)
@Controller('api/v1/salons/:salonId/bookings')
export class OwnerBookingsController {
  private readonly log = createChildLogger('owner-bookings.controller');
  constructor(
    private readonly bookings: BookingQueryService,
    private readonly bookingSync: BookingSyncService,
    private readonly crmIntegration: CrmIntegrationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List salon bookings' })
  @ApiOkResponse({ description: 'List of bookings', ...envelopeRef(BookingListResponseDtoClass) })
  async list(
    @Param('salonId', new ParseUUIDPipe()) salonId: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('included') included?: string,
    @Req() _req?: Request,
  ): Promise<BookingListResponseDto> {
    const fromDate = this.toDate(from);
    const toDate = this.toDate(to);
    const take = limit ? Number(limit) : undefined;
    const includeHistory = this.hasInclude(included, 'history');
    return this.bookings.listForSalon({
      salonId,
      status: status || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
      limit: Number.isFinite(take) ? take : undefined,
      cursor: cursor || undefined,
      includeHistory,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a salon booking by id' })
  @ApiOkResponse({ description: 'Booking', ...envelopeRef(BookingResponseDto) })
  async get(
    @Param('salonId', new ParseUUIDPipe()) salonId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('included') included?: string,
  ): Promise<BookingDto> {
    const booking = await this.bookings.getForSalon(id, salonId, this.hasInclude(included, 'history'));
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync bookings now from CRM and persist' })
  @ApiOkResponse({ description: 'Sync result', ...envelopeArrayRef(BookingResponseDto) })
  async syncNow(
    @Param('salonId', new ParseUUIDPipe()) salonId: string
  ): Promise<BookingDto[]> {
    return this.bookingSync.rebaseFromCrm(salonId);
  }

  @Post('sync/async')
  @ApiOperation({ summary: 'Schedule async bookings sync job' })
  @ApiOkResponse({ description: 'Job enqueued', ...envelopeRef(SyncBookingsJobResponseDto) })
  async syncAsync(
    @Param('salonId', new ParseUUIDPipe()) salonId: string,
    @Body() body?: { provider?: CrmType },
  ) {
    const provider = body?.provider ?? (await this.crmIntegration.resolveSalonProvider(salonId));
    const { jobId } = await this.crmIntegration.enqueueBookingsSync(salonId, provider);
    return { jobId };
  }

  private toDate(value?: string): Date | null {
    if (!value) return null;
    const ts = Date.parse(value);
    return Number.isFinite(ts) ? new Date(ts) : null;
  }

  private hasInclude(included: string | undefined, token: string): boolean {
    if (!included) return false;
    return included
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
      .includes(token.toLowerCase());
  }
}
