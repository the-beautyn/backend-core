import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { BookingQueryService } from '../../../booking/booking-query.service';
import { BookingSyncService } from '../../../booking/booking-sync.service';
import { BookingDto, BookingListResponseDto, BookingListResponseDtoClass, BookingResponseDto } from '../../../booking/dto/booking.response.dto';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { ClientRolesGuard } from '../../../shared/guards/roles.guard';
import { envelopeRef } from '../../../shared/utils/swagger-envelope.util';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ClientRolesGuard)
@Controller('api/v1/bookings')
export class ClientBookingsController {
  constructor(
    private readonly bookings: BookingQueryService,
    private readonly bookingSync: BookingSyncService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List current client bookings' })
  @ApiOkResponse({ description: 'List of bookings', ...envelopeRef(BookingListResponseDtoClass) })
  async list(
    @Query('status') status: string | undefined,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('sort') sort?: string,
    @Req() req?: Request & { user?: { id?: string } },
  ): Promise<BookingListResponseDto> {
    const userId = req?.user?.id as string;
    const fromDate = this.toDate(from);
    const toDate = this.toDate(to);
    const take = limit ? Number(limit) : undefined;
    return this.bookings.listForClient({
      userId,
      status: status || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
      limit: Number.isFinite(take) ? take : undefined,
      cursor: cursor || undefined,
      sort: sort === 'datetime_asc' ? 'datetime_asc' : sort === 'datetime_desc' ? 'datetime_desc' : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a booking by id' })
  @ApiOkResponse({ description: 'Booking', ...envelopeRef(BookingResponseDto) })
  async get(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req?: Request & { user?: { id?: string } },
  ): Promise<BookingDto> {
    const booking = await this.bookings.getForClient(id, req?.user?.id as string);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  // Reconcile a single booking with its CRM (called when the client closes the CRM "Make Change"
  // web page) and return the refreshed booking — the same shape GET /:id returns.
  @Post(':id/refresh')
  @ApiOperation({ summary: 'Refresh a booking from its CRM and return the reconciled state' })
  @ApiOkResponse({ description: 'Booking', ...envelopeRef(BookingResponseDto) })
  async refresh(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req?: Request & { user?: { id?: string } },
  ): Promise<BookingDto> {
    const userId = req?.user?.id as string;
    // Ownership check before touching the CRM: getForClient is scoped to userId.
    const owned = await this.bookings.getForClient(id, userId);
    if (!owned) {
      throw new NotFoundException('Booking not found');
    }
    await this.bookingSync.refreshSingle(id);
    const refreshed = await this.bookings.getForClient(id, userId);
    if (!refreshed) {
      throw new NotFoundException('Booking not found');
    }
    return refreshed;
  }

  private toDate(value?: string): Date | null {
    if (!value) return null;
    const ts = Date.parse(value);
    return Number.isFinite(ts) ? new Date(ts) : null;
  }
}
