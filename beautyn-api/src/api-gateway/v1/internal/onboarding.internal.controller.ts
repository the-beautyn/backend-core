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
import { OnboardingService } from '../../../onboarding/onboarding.service';
import { CrmLinkedDto } from '../../../onboarding/dto/crm-linked.dto';

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const key = req.headers['x-internal-key'];
    return key === process.env.INTERNAL_API_KEY;
  }
}

@Controller('api/v1/internal/onboarding')
export class OnboardingInternalController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('crm-linked')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async crmLinked(@Body() dto: CrmLinkedDto) {
    await this.onboardingService.markCrmLinked(dto.salon_id, dto.provider);
  }
}
