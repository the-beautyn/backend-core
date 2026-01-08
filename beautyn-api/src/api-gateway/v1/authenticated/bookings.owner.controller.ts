import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { BookingQueryService } from '../../../booking/booking-query.service';
import { BookingDto, BookingListResponseDto } from '../../../booking/dto/booking.response.dto';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { OwnerRolesGuard } from '../../../shared/guards/roles.guard';
import { SalonOwnerGuard } from '../../../shared/guards/salon-owner.guard';

@ApiTags('Salon Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OwnerRolesGuard, SalonOwnerGuard)
@Controller('api/v1/salons/:salonId/bookings')
export class OwnerBookingsController {
  constructor(private readonly bookings: BookingQueryService) {}

  @Get()
  @ApiOperation({ summary: 'List salon bookings' })
  @ApiOkResponse({ description: 'List of bookings', type: Object })
  async list(
    @Param('salonId', new ParseUUIDPipe()) salonId: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Req() _req?: Request,
  ): Promise<BookingListResponseDto> {
    const fromDate = this.toDate(from);
    const toDate = this.toDate(to);
    const take = limit ? Number(limit) : undefined;
    return this.bookings.listForSalon({
      salonId,
      status: status || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
      limit: Number.isFinite(take) ? take : undefined,
      cursor: cursor || undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a salon booking by id' })
  @ApiOkResponse({ description: 'Booking', type: Object })
  async get(
    @Param('salonId', new ParseUUIDPipe()) salonId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<BookingDto> {
    const booking = await this.bookings.getForSalon(id, salonId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  private toDate(value?: string): Date | null {
    if (!value) return null;
    const ts = Date.parse(value);
    return Number.isFinite(ts) ? new Date(ts) : null;
  }
}
