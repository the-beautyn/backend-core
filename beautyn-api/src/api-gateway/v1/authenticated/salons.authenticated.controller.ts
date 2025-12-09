import { Controller, Get, NotFoundException, ParseBoolPipe, Query, Req, UseGuards, Param } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { SalonService } from '../../../salon/salon.service';
import { SalonDto } from '../../../salon/dto/salon.dto';
import { envelopeErrorSchema, envelopeRef } from '../../../shared/utils/swagger-envelope.util';
import { SearchHistoryService } from '../../../search/search-history.service';
import { createChildLogger } from '@shared/logger';

@ApiTags('Salons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/salon')
export class SalonsAuthenticatedController {
  private readonly log = createChildLogger('salons.controller');

  constructor(
    private readonly salonService: SalonService,
    private readonly searchHistoryService: SearchHistoryService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my salon (by owner user id)' })
  @ApiOkResponse(envelopeRef(SalonDto))
  async me(@Req() req: Request & { user: { id: string } }) {
    const salon = await this.salonService.findByOwnerUserId(req.user.id);
    if (!salon) throw new NotFoundException('Salon not found');
    return salon;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get salon by id' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse(envelopeRef(SalonDto))
  @ApiBadRequestResponse(
    envelopeErrorSchema({ statusCode: 404, message: 'Not Found', error: 'Not Found' }),
  )
  async get(
    @Param('id') id: string,
    @Req() req: Request & { user?: { id: string } },
    @Query('isFromSearch', new ParseBoolPipe({ optional: true })) isFromSearch?: boolean,
  ) {
    const salon = await this.salonService.findById(id);
    if (!salon) throw new NotFoundException('Salon not found');
    const userId = req?.user?.id;
    if (userId && isFromSearch) {
      this.searchHistoryService
        .addVisit(userId, id, null)
        .catch((err) =>
          this.log.warn('Failed to save search history visit', { err, userId, salonId: id }),
        );
    }
    return salon;
  }
}
