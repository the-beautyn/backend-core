import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiAcceptedResponse,
  ApiOperation,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from '../../../../auth/auth.service';
import { LoginDto } from '../../../../auth/dto/v1/login.dto';
import { RegisterDto } from '../../../../auth/dto/v1/register.dto';
import { ForgotPasswordDto } from '../../../../auth/dto/v1/forgot-password.dto';
import { ResetPasswordDto } from '../../../../auth/dto/v1/reset-password.dto';
import { LoginResponseDto } from '../../../../auth/dto/v1/login-response.dto';
import { RegisterResponseDto } from '../../../../auth/dto/v1/register-response.dto';
import { MessageResponseDto } from '../../../../auth/dto/v1/message-response.dto';
import { envelopeSchema } from '../../../../shared/utils/swagger-envelope.util';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthPublicController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse(envelopeSchema(LoginResponseDto))
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'User registration' })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse(envelopeSchema(RegisterResponseDto))
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'User logout' })
  @ApiOkResponse(envelopeSchema(MessageResponseDto))
  async logout() {
    await this.authService.logout();
  }

  @Post('forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Send password reset email' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiAcceptedResponse(envelopeSchema(MessageResponseDto))
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse(envelopeSchema(MessageResponseDto))
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
