import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { UserService } from '../../../user/user.service';
import { AuthService } from '../../../auth/auth.service';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { UpdateUserDto } from '../../../user/dto/update-user.dto';
import { UserResponseDto } from '../../../user/dto/user-response.dto';
import { ChangePasswordDto } from '../../../auth/dto/v1/change-password.dto';
import { ResetPasswordResponseDto } from '../../../auth/dto/v1/reset-password-response.dto';
import { TransformUserResponseInterceptor } from '../../../user/interceptors/transform-user-response.interceptor';
import { envelopeRef, envelopeErrorSchema } from '../../../shared/utils/swagger-envelope.util';

@ApiTags('User')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/user')
export class UserAuthenticatedController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  @Get('me')
  @UseInterceptors(TransformUserResponseInterceptor)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiQuery({
    name: 'include',
    required: false,
    description:
      'Comma-separated list of optional expansions. Supported: "settings".',
    example: 'settings',
  })
  @ApiOkResponse(envelopeRef(UserResponseDto))
  @ApiUnauthorizedResponse(
    envelopeErrorSchema({ statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' })
  )
  async me(
    @Req() req: Request & { user: { id: string } },
    @Query('include') include?: string,
  ) {
    const includeSettings = (include ?? '')
      .split(',')
      .map((s) => s.trim())
      .includes('settings');
    return this.userService.findById(req.user.id, { includeSettings });
  }

  @Patch('update')
  @UseInterceptors(TransformUserResponseInterceptor)
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse(envelopeRef(UserResponseDto))
  @ApiUnauthorizedResponse(
    envelopeErrorSchema({ statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' })
  )
  async update(
    @Req() req: Request & { user: { id: string } },
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.updateProfile(req.user.id, dto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change current user password' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse(envelopeRef(ResetPasswordResponseDto))
  @ApiUnauthorizedResponse(
    envelopeErrorSchema({ statusCode: 401, message: 'Current password is incorrect', error: 'Unauthorized' })
  )
  @ApiBadRequestResponse(
    envelopeErrorSchema({ statusCode: 400, message: 'New password must differ from current', error: 'Bad Request' })
  )
  async changePassword(
    @Req() req: Request & { user: { id: string } },
    @Body() dto: ChangePasswordDto,
  ): Promise<ResetPasswordResponseDto> {
    return this.authService.changePassword(req.user.id, dto);
  }
}