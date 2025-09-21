import { Controller, Get, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { envelopeArrayRef, envelopeErrorSchema } from '../../../shared/utils/swagger-envelope.util';
import { BookingsService } from '../../../bookings/bookings.service';
import { BookingsPullQuery } from '../../../bookings/dto/bookings-pull.query';
import { BookingDto } from '../../../bookings/dto/booking.dto';
import { CrmType } from '@crm/shared';
import { UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { Request } from 'express';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get('bookings')
  @ApiOperation({ summary: 'Pull bookings from CRM (optionally filter by client/date/deleted)' })
  @ApiOkResponse(envelopeArrayRef(BookingDto))
  @ApiBadRequestResponse(
    envelopeErrorSchema({ statusCode: 400, message: 'Bad Request', error: 'Bad Request' }),
  )
  async pull(@Req() req: Request & { user: { id: string } }, @Query() q: BookingsPullQuery) {
    const items = await this.bookings.pullMyBookings(req.user.id, {
      clientExternalId: q.client_external_id,
      withDeleted: q.with_deleted,
      startDate: q.start_date,
      endDate: q.end_date,
      page: q.page,
      count: q.count,
    });
    return items;
  }
}


