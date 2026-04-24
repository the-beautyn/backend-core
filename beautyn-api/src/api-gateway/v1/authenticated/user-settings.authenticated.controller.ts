import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { UserSettingsService } from '../../../user-settings/user-settings.service';
import { UpdateNotificationSettingsDto } from '../../../user-settings/dto/update-notification-settings.dto';
import { ClientSettingsResponseDto } from '../../../client-settings/dto/client-settings-response.dto';
import { OwnerSettingsResponseDto } from '../../../owner-settings/dto/owner-settings-response.dto';
import { envelopeErrorSchema } from '../../../shared/utils/swagger-envelope.util';

const settingsOneOf = () => ({
  schema: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        oneOf: [
          { $ref: getSchemaPath(ClientSettingsResponseDto) },
          { $ref: getSchemaPath(OwnerSettingsResponseDto) },
        ],
      },
    },
  },
});

@ApiTags('User Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/user/settings')
export class UserSettingsAuthenticatedController {
  constructor(private readonly service: UserSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user settings (shape depends on role)' })
  @ApiOkResponse(settingsOneOf())
  @ApiUnauthorizedResponse(
    envelopeErrorSchema({ statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' }),
  )
  async getAll(@Req() req: Request & { user: { id: string; role: UserRole } }) {
    return this.service.getSettings(req.user.id, req.user.role);
  }

  @Patch('notifications')
  @ApiOperation({
    summary:
      'Update notification preferences. Accepts push_enabled (client) or in_app_enabled (owner); email/sms apply to both.',
  })
  @ApiBody({ type: UpdateNotificationSettingsDto })
  @ApiOkResponse(settingsOneOf())
  @ApiUnauthorizedResponse(
    envelopeErrorSchema({ statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' }),
  )
  async updateNotifications(
    @Req() req: Request & { user: { id: string; role: UserRole } },
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    return this.service.updateNotifications(req.user.id, req.user.role, dto);
  }
}
