import { Controller, Get, NotFoundException, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { SalonService } from '../../../salon/salon.service';
import { SalonDto } from '../../../salon/dto/salon.dto';
import { envelopeRef } from '../../../shared/utils/swagger-envelope.util';

@ApiTags('Salons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/salon')
export class SalonsAuthenticatedController {
  constructor(private readonly salonService: SalonService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my salon (by owner user id)' })
  @ApiOkResponse(envelopeRef(SalonDto))
  async me(@Req() req: Request & { user: { id: string } }) {
    const salon = await this.salonService.findByOwnerUserId(req.user.id);
    if (!salon) throw new NotFoundException('Salon not found');
    return salon;
  }
}



