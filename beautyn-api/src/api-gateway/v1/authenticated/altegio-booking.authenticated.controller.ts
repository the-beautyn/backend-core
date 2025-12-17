import { Body, Controller, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AltegioBookingService } from '../../../booking/altegio-booking/altegio-booking.service';
import { CreateAltegioRecordDto } from '../../../booking/altegio-booking/dto/create-record.dto';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { envelopeErrorSchema, envelopeRef } from '../../../shared/utils/swagger-envelope.util';
import { CreateAltegioRecordResponseDto } from '../../../booking/altegio-booking/dto/create-record.response.dto';
import { Request } from 'express';
import { ClientRolesGuard } from '../../../shared/guards/roles.guard';

@ApiTags('Altegio Booking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ClientRolesGuard)
@Controller('api/v1/booking/altegio')
export class AltegioBookingAuthenticatedController {
  constructor(private readonly booking: AltegioBookingService) {}

  @Post(':salonId/records')
  @ApiOperation({ summary: 'Create booking record in Altegio and persist locally' })
  @ApiOkResponse(envelopeRef(CreateAltegioRecordResponseDto))
  @ApiBadRequestResponse(envelopeErrorSchema({ statusCode: 400, message: 'Bad Request', error: 'Bad Request' }))
  async create(
    @Param('salonId', new ParseUUIDPipe()) salonId: string,
    @Body() dto: CreateAltegioRecordDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.booking.createRecord(salonId, req.user.id, dto);
  }
}
