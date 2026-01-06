import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { BookingService } from '../../../booking/booking.service';
import { ConfirmEasyweekBookingDto } from '../../../booking/dto/confirm-easyweek-booking.dto';
import { ConfirmEasyweekBookingResponseDto } from '../../../booking/dto/confirm-easyweek-booking.response.dto';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { ClientRolesGuard } from '../../../shared/guards/roles.guard';
import { envelopeErrorSchema, envelopeRef } from '../../../shared/utils/swagger-envelope.util';

@ApiTags('EasyWeek Booking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ClientRolesGuard)
@Controller('api/v1/bookings/easyweek')
export class EasyweekBookingAuthenticatedController {
  constructor(private readonly bookings: BookingService) {}

  @Post('confirm')
  @ApiOperation({ summary: 'Confirm EasyWeek widget booking and persist locally' })
  @ApiOkResponse(envelopeRef(ConfirmEasyweekBookingResponseDto))
  @ApiBadRequestResponse(envelopeErrorSchema({ statusCode: 400, message: 'Bad Request', error: 'Bad Request' }))
  async confirm(
    @Body() dto: ConfirmEasyweekBookingDto,
    @Req() req: Request & { user?: { id?: string } },
  ) {
    return this.bookings.confirmEasyweekBooking(dto.salonId, dto.bookingUuid, req.user?.id);
  }
}
