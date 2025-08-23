import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ServicesService } from '../../../services/services.service';
import { ServicesSyncDto } from '../../../services/dto/services-sync.dto';
import { InternalApiKeyGuard } from '../../../shared/guards/internal-api-key.guard';

@Controller('api/v1/internal/services')
export class ServicesInternalController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post('sync')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async sync(@Body() dto: ServicesSyncDto) {
    return this.servicesService.syncFromCrm(dto);
  }
}
