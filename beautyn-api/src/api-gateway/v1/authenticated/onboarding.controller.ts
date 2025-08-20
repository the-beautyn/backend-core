import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiAcceptedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { envelopeRef, envelopeErrorSchema } from '../../../shared/utils/swagger-envelope.util';
import { OnboardingService } from '../../../onboarding/onboarding.service';
import { OnboardingProgressDto } from '../../../onboarding/dto/onboarding-progress.dto';
import { DiscoverEasyWeekDto } from '../../../onboarding/dto/discover-easyweek.dto';
import { FinalizeEasyWeekDto } from '../../../onboarding/dto/finalize-easyweek.dto';
import { FinalizeEasyWeekResponseDto } from '../../../onboarding/dto/finalize-easyweek-response.dto';
import { DiscoverEasyWeekResponseDto } from '../../../onboarding/dto/discover-easyweek-response.dto';

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

  @Post('easyweek/discover')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Discover EasyWeek salons for given credentials' })
  @ApiOkResponse(envelopeRef(DiscoverEasyWeekResponseDto))
  async discover(@Req() req: Request & { user: { id: string } }, @Body() dto: DiscoverEasyWeekDto) {
    const userId = req.user.id as string;
    return this.onboardingService.discoverEasyWeekSalons(
      userId,
      dto.auth_token,
      dto.workspace_slug,
    );
  }

  @Post('easyweek/connect')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Finalize EasyWeek link with selected salon' })
  @ApiAcceptedResponse(envelopeRef(FinalizeEasyWeekResponseDto))
  async finalize(@Req() req: Request & { user: { id: string } }, @Body() dto: FinalizeEasyWeekDto) {
    const userId = req.user.id as string;
    const { jobId } = await this.onboardingService.finalizeEasyWeekLink(
      userId,
      dto.auth_token,
      dto.workspace_slug,
      dto.salon_uuid,
    );
    return { job_id: jobId };
  }
}
