import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AltegioBookingService } from '../../../booking/altegio-booking/altegio-booking.service';
import { GetBookableServicesDto } from '../../../booking/altegio-booking/dto/get-services.dto';
import { GetBookableWorkersDto } from '../../../booking/altegio-booking/dto/get-workers.dto';
import { GetBookableDatesDto } from '../../../booking/altegio-booking/dto/get-dates.dto';
import { GetTimeSlotsDto } from '../../../booking/altegio-booking/dto/get-timeslots.dto';
import { envelopeErrorSchema, envelopeRef } from '../../../shared/utils/swagger-envelope.util';
import { BookableServicesResponseDto } from '../../../booking/altegio-booking/dto/bookable-services.response.dto';
import { BookableWorkersResponseDto } from '../../../booking/altegio-booking/dto/bookable-workers.response.dto';
import { BookableDatesResponseDto } from '../../../booking/altegio-booking/dto/bookable-dates.response.dto';
import { TimeSlotsResponseDto } from '../../../booking/altegio-booking/dto/time-slots.response.dto';

@ApiTags('Altegio Booking')
@Controller('api/v1/booking/altegio')
export class AltegioBookingPublicController {
  constructor(private readonly booking: AltegioBookingService) {}

  @Get(':salonId/services')
  @ApiOperation({ summary: 'Get bookable services with compatibility filtering' })
  @ApiOkResponse(envelopeRef(BookableServicesResponseDto))
  @ApiBadRequestResponse(envelopeErrorSchema({ statusCode: 400, message: 'Bad Request', error: 'Bad Request' }))
  async getServices(@Param('salonId', new ParseUUIDPipe()) salonId: string, @Query() query: GetBookableServicesDto) {
    return this.booking.getBookableServices(salonId, query);
  }

  @Get(':salonId/workers')
  @ApiOperation({ summary: 'Get bookable workers filtered by services and/or datetime' })
  @ApiOkResponse(envelopeRef(BookableWorkersResponseDto))
  @ApiBadRequestResponse(envelopeErrorSchema({ statusCode: 400, message: 'Bad Request', error: 'Bad Request' }))
  async getWorkers(@Param('salonId', new ParseUUIDPipe()) salonId: string, @Query() query: GetBookableWorkersDto) {
    return this.booking.getBookableWorkers(salonId, query);
  }

  @Get(':salonId/dates')
  @ApiOperation({ summary: 'Get bookable dates for calendar' })
  @ApiOkResponse(envelopeRef(BookableDatesResponseDto))
  @ApiBadRequestResponse(envelopeErrorSchema({ statusCode: 400, message: 'Bad Request', error: 'Bad Request' }))
  async getDates(@Param('salonId', new ParseUUIDPipe()) salonId: string, @Query() query: GetBookableDatesDto) {
    return this.booking.getBookableDates(salonId, query);
  }

  @Get(':salonId/timeslots')
  @ApiOperation({ summary: 'Get available time slots' })
  @ApiOkResponse(envelopeRef(TimeSlotsResponseDto))
  @ApiBadRequestResponse(envelopeErrorSchema({ statusCode: 400, message: 'Bad Request', error: 'Bad Request' }))
  async getTimes(@Param('salonId', new ParseUUIDPipe()) salonId: string, @Query() query: GetTimeSlotsDto) {
    return this.booking.getTimeSlots(salonId, query);
  }
}
