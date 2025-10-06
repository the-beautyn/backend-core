import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiAcceptedResponse,
  ApiBadRequestResponse,
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
import { CrmProvidersRegistry } from '../../../onboarding/providers/crm-providers.registry';
import { CrmProviderListResponseDto } from '../../../onboarding/dto/crm-provider-list.dto';
import { CrmProviderDto } from '../../../onboarding/dto/crm-provider.dto';
import { CrmSalonPreviewDto } from '../../../onboarding/dto/crm-salon-preview.dto';
import { AltegioPairCodeResponseDto } from '../../../onboarding/dto/altegio-pair-code.dto';
import { SubmitSalonFromCrmDto } from '../../../onboarding/dto/submit-salon-from-crm.dto';

@ApiTags('Onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/onboarding')
export class OnboardingController {
  constructor(
    private readonly onboardingService: OnboardingService,
    private readonly crmRegistry: CrmProvidersRegistry,
  ) {}

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
    await this.onboardingService.finalizeEasyWeekLink(
      userId,
      dto.auth_token,
      dto.workspace_slug,
      dto.salon_uuid,
    );
    return { success: true } as any;
  }

  // CRM registry endpoints

  @Get('crms')
  @UseGuards(JwtAuthGuard)
  @ApiTags('Onboarding / CRMs')
  @ApiOperation({
    summary: 'List available CRMs',
    description: 'Returns providers, connect flows, fields, and coarse capabilities.',
  })
  @ApiOkResponse(envelopeRef(CrmProviderListResponseDto))
  @ApiBadRequestResponse(envelopeErrorSchema())
  async listCrms() {
    const providers = this.crmRegistry.list();
    return { success: true, data: { providers } };
  }

  @Get('crms/:code')
  @UseGuards(JwtAuthGuard)
  @ApiTags('Onboarding / CRMs')
  @ApiOperation({ summary: 'Get provider descriptor' })
  @ApiOkResponse(envelopeRef(CrmProviderDto))
  @ApiBadRequestResponse(envelopeErrorSchema())
  async getCrm(@Param('code') code: 'EASYWEEK' | 'ALTEGIO') {
    const d = this.crmRegistry.get(code);
    if (!d) throw new NotFoundException('Unknown provider');
    return { success: true, data: d };
  }

  @Post('altegio/pair-code')
  @UseGuards(JwtAuthGuard)
  @ApiTags('Onboarding / CRMs')
  @ApiOperation({ summary: 'Generate 6-digit pairing code for Altegio' })
  @ApiOkResponse(envelopeRef(AltegioPairCodeResponseDto))
  @ApiBadRequestResponse(envelopeErrorSchema())
  async pairCode(@Req() req: Request & { user: { id: string } }) {
    const userId = req.user.id as string;
    const { code, expiresAt } = await this.onboardingService.generateAltegioPairCode(userId);
    return { success: true, data: { code, expires_at: expiresAt.toISOString() } };
  }

  @Get('crm/salon-preview')
  @HttpCode(HttpStatus.OK)
  @ApiTags('Onboarding / CRMs')
  @ApiOperation({ summary: 'Preview salon data from connected CRM' })
  @ApiOkResponse(envelopeRef(CrmSalonPreviewDto))
  @ApiBadRequestResponse(
    envelopeErrorSchema({ statusCode: 400, message: 'CRM is not connected', error: 'Bad Request' })
  )
  async salonPreview(
    @Req() req: Request & { user: { id: string } },
  ) {
    const userId = req.user.id as string;
    const data = await this.onboardingService.getCrmSalonPreviewForUser(userId);
    return { success: true, data };
  }

  @Post('crm/initial/sync/async')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiTags('Onboarding / CRMs')
  @ApiOperation({ summary: 'Schedule initial CRM sync for owner salon' })
  @ApiAcceptedResponse(envelopeRef(Object))
  async startInitialSync(@Req() req: Request & { user: { id: string } }) {
    const userId = req.user.id as string;
    const { jobId } = await this.onboardingService.startInitialSync(userId);
    return { success: true, data: { jobId } } as any;
  }

  @Post('crm/initial/sync')
  @HttpCode(HttpStatus.OK)
  @ApiTags('Onboarding / CRMs')
  @ApiOperation({ summary: 'Run initial CRM pull synchronously for owner salon (no queue)' })
  @ApiOkResponse(envelopeRef(Object))
  async startInitialPullNow(@Req() req: Request & { user: { id: string } }) {
    const userId = req.user.id as string;
    const data = await this.onboardingService.startInitialPullNow(userId);
    return { success: true, data };
  }

  @Post('submit-salon')
  @HttpCode(HttpStatus.OK)
  @ApiTags('Onboarding / CRMs')
  @ApiOperation({ summary: 'Apply CRM salon preview to local record and advance onboarding' })
  @ApiOkResponse(envelopeRef(Object))
  async submitSalon(@Req() req: Request & { user: { id: string } }, @Body() dto: SubmitSalonFromCrmDto) {
    const userId = req.user.id as string;
    const result = await this.onboardingService.submitSalonFromCrm(userId, dto);
    return { success: true, data: result } as any;
  }
}
