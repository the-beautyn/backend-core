import { Controller, Get, Query } from '@nestjs/common';
import { ServicesService } from '../../../services/services.service';
import { ServicesListQuery } from '../../../services/dto/services-list.query';

@Controller('api/v1/public')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get('services')
  async list(@Query() query: ServicesListQuery) {
    return this.servicesService.list(query);
  }

  @Get('categories')
  async categories(@Query('salon_id') salonId: string) {
    return this.servicesService.listCategories(salonId);
  }
}
