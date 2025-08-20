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
} from '@nestjs/common';
import { WorkersService } from '../../../workers/workers.service';
import { WorkersSyncDto } from '../../../workers/dto/workers-sync.dto';

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const key = req.headers['x-internal-key'];
    const internalApiKey = process.env.INTERNAL_API_KEY;
    if (!internalApiKey || internalApiKey.trim() === '') {
      return false;
    }
    return key === internalApiKey;
  }
}

@Controller('api/v1/internal/workers')
export class WorkersInternalController {
  constructor(private readonly workersService: WorkersService) {}

  @Post('sync')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  sync(@Body() dto: WorkersSyncDto) {
    return this.workersService.syncFromCrm(dto);
  }
}
