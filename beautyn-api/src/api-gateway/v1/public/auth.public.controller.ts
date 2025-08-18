import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiAcceptedResponse,
  ApiOperation,
  ApiBody,
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { AuthService } from '../../../auth/auth.service';
import { LoginDto } from '../../../auth/dto/v1/login.dto';
import { RegisterDto } from '../../../auth/dto/v1/register.dto';
import { ForgotPasswordDto } from '../../../auth/dto/v1/forgot-password.dto';
import { ResetPasswordDto } from '../../../auth/dto/v1/reset-password.dto';
import { LoginResponseDto } from '../../../auth/dto/v1/login-response.dto';
import { RegisterResponseDto } from '../../../auth/dto/v1/register-response.dto';
import { ResetPasswordResponseDto } from '../../../auth/dto/v1/reset-password-response.dto';
import { envelopeRef, envelopeErrorSchema, envelopeSuccessOnly } from '../../../shared/utils/swagger-envelope.util';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { Request } from 'express';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthPublicController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse(envelopeRef(LoginResponseDto))
  @ApiUnauthorizedResponse(
    envelopeErrorSchema({ statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' })
  )
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'User registration' })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse(envelopeRef(RegisterResponseDto))
  @ApiBadRequestResponse(
    envelopeErrorSchema({ statusCode: 400, message: 'Bad Request', error: 'Bad Request' })
  )
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User logout' })
  @ApiBearerAuth()
  @ApiOkResponse(envelopeSuccessOnly())
  @ApiForbiddenResponse(
    envelopeErrorSchema({ statusCode: 403, message: 'Forbidden', error: 'Forbidden' })
  )
  async logout(@Req() req: Request & { user: { accessToken: string; } }) {
    const { accessToken } = req.user;
    await this.authService.logout(accessToken);
    return { success: true };
  }

  @Post('forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Send password reset email' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiAcceptedResponse(envelopeSuccessOnly())
  @ApiBadRequestResponse(
    envelopeErrorSchema({ statusCode: 400, message: 'Bad Request', error: 'Bad Request' })
  )
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto);
    return { success: true };
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse(envelopeRef(ResetPasswordResponseDto))
  @ApiBadRequestResponse(
    envelopeErrorSchema({ statusCode: 400, message: 'Bad Request', error: 'Bad Request' })
  )
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
