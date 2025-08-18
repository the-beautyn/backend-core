import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiNotImplementedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { envelopeRef, envelopeErrorSchema } from '../../../shared/utils/swagger-envelope.util';
import { OnboardingService } from '../../../onboarding/onboarding.service';
import { OnboardingProgressDto } from '../../../onboarding/dto/onboarding-progress.dto';

@ApiTags('Onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('progress')
  @ApiOperation({ summary: 'Get onboarding progress' })
  @ApiOkResponse(envelopeRef(OnboardingProgressDto))
  @ApiUnauthorizedResponse(
    envelopeErrorSchema({ statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' })
  )
  async progress(@Req() req: Request & { user: { id: string } }) {
    return this.onboardingService.getOrCreateProgress(req.user.id);
  }

  @Post('connect/easyweek')
  @ApiOperation({ summary: 'Connect EasyWeek CRM (stub)' })
  @ApiNotImplementedResponse({
    description: 'Implemented in Task 2',
    schema: { example: { code: 'NOT_IMPLEMENTED', message: 'Implemented in Task 2' } },
  })
  async connectEasyWeek(@Res() res: Response) {
    return res.status(HttpStatus.NOT_IMPLEMENTED).json({
      code: 'NOT_IMPLEMENTED',
      message: 'Implemented in Task 2',
    });
  }
}
