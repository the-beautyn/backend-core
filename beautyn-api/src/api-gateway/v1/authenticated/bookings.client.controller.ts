import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { BookingQueryService } from '../../../booking/booking-query.service';
import { BookingDto, BookingListResponseDto } from '../../../booking/dto/booking.response.dto';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { ClientRolesGuard } from '../../../shared/guards/roles.guard';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ClientRolesGuard)
@Controller('api/v1/bookings')
export class ClientBookingsController {
  constructor(private readonly bookings: BookingQueryService) {}

  @Get()
  @ApiOperation({ summary: 'List current client bookings' })
  @ApiOkResponse({ description: 'List of bookings', type: Object })
  async list(
    @Query('status') status: string | undefined,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
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
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a booking by id' })
  @ApiOkResponse({ description: 'Booking', type: Object })
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

  private toDate(value?: string): Date | null {
    if (!value) return null;
    const ts = Date.parse(value);
    return Number.isFinite(ts) ? new Date(ts) : null;
  }
}
