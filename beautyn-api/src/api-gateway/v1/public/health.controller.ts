import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';

@Controller('api/v1/health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
