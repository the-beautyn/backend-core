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
import { ApiExcludeController } from '@nestjs/swagger';
import { SalonService } from '../../../salon/salon.service';
import { SalonImagesSyncDto } from '../../../salon/dto/salon-images-sync.dto';
import { InternalApiKeyGuard } from '../../../shared/guards/internal-api-key.guard';
import { SalonPullDto } from '../../../salon/dto/salon-pull.dto';

@ApiExcludeController()
@Controller('api/v1/internal/salons')
export class SalonsInternalController {
  constructor(private readonly salonService: SalonService) {}

  @Post(':id/images/sync')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async syncImages(@Param('id') id: string, @Body() dto: SalonImagesSyncDto) {
    return this.salonService.replaceImages(id, dto);
  }

  @Post('pull')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async pullSalon(@Body() dto: SalonPullDto) {
    return this.salonService.pullSalon(dto.salon_id);
  }
}
