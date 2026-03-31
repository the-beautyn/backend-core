import { Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { SavedSalonsService } from '../../../saved-salons/saved-salons.service';
import { SavedSalonListQueryDto } from '../../../saved-salons/dto/saved-salon-list-query.dto';
import { SavedSalonListResponseDto } from '../../../saved-salons/dto/saved-salon-response.dto';
import { SavedSalonToggleResponseDto } from '../../../saved-salons/dto/saved-salon-toggle-response.dto';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { ClientRolesGuard } from '../../../shared/guards/roles.guard';
import { envelopeRef } from '../../../shared/utils/swagger-envelope.util';

@ApiTags('Saved Salons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ClientRolesGuard)
@Controller('api/v1/saved-salons')
export class SavedSalonsController {
  constructor(private readonly savedSalons: SavedSalonsService) {}

  @Post(':salonId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save a salon' })
  @ApiOkResponse(envelopeRef(SavedSalonToggleResponseDto))
  async save(
    @Param('salonId', new ParseUUIDPipe()) salonId: string,
    @Req() req: Request & { user?: { id?: string } },
  ) {
    const userId = req.user?.id as string;
    await this.savedSalons.save(userId, salonId);
    return { saved: true };
  }

  @Delete(':salonId')
  @ApiOperation({ summary: 'Unsave a salon' })
  @ApiOkResponse(envelopeRef(SavedSalonToggleResponseDto))
  async unsave(
    @Param('salonId', new ParseUUIDPipe()) salonId: string,
    @Req() req: Request & { user?: { id?: string } },
  ) {
    const userId = req.user?.id as string;
    await this.savedSalons.unsave(userId, salonId);
    return { saved: false };
  }

  @Get()
  @ApiOperation({ summary: 'List saved salons' })
  @ApiOkResponse(envelopeRef(SavedSalonListResponseDto))
  async list(
    @Query() query: SavedSalonListQueryDto,
    @Req() req: Request & { user?: { id?: string } },
  ): Promise<SavedSalonListResponseDto> {
    const userId = req.user?.id as string;
    return this.savedSalons.listByUser(userId, query);
  }
}
