import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { SalonService } from '../../../salon/salon.service';
import { SalonListQuery } from '../../../salon/dto/salon-list.query';

@Controller('api/v1/public/salons')
export class SalonsController {
  constructor(private readonly salonService: SalonService) {}

  @Get()
  list(@Query() query: SalonListQuery) {
    return this.salonService.list(query);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const salon = await this.salonService.findById(id);
    if (!salon) throw new NotFoundException('Salon not found');
    return salon;
  }

  @Get(':id/images')
  async images(@Param('id') id: string) {
    const salon = await this.salonService.findById(id);
    if (!salon) throw new NotFoundException('Salon not found');
    return this.salonService.listImages(id);
  }
}
