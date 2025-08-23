import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Injectable,
  UseGuards,
  ExecutionContext,
  CanActivate,
  Post,
  Param,
} from '@nestjs/common';
import { SalonService } from '../../../salon/salon.service';
import { SalonSyncDto } from '../../../salon/dto/salon-sync.dto';
import { SalonImagesSyncDto } from '../../../salon/dto/salon-images-sync.dto';
import { InternalApiKeyGuard } from '../../../shared/guards/internal-api-key.guard';

@Controller('api/v1/internal/salons')
export class SalonsInternalController {
  constructor(private readonly salonService: SalonService) {}

  @Post('sync')
  @UseGuards(InternalApiKeyGuard)
  async sync(@Body() dto: SalonSyncDto) {
    return this.salonService.upsertFromCrm(dto);
  }

  @Post(':id/images/sync')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async syncImages(@Param('id') id: string, @Body() dto: SalonImagesSyncDto) {
    return this.salonService.replaceImages(id, dto);
  }
}
