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
} from '@nestjs/swagger';
import { AuthService } from '../../../../auth/auth.service';
import { LoginDto } from '../../../../auth/dto/v1/login.dto';
import { RegisterDto } from '../../../../auth/dto/v1/register.dto';
import { ForgotPasswordDto } from '../../../../auth/dto/v1/forgot-password.dto';
import { ResetPasswordDto } from '../../../../auth/dto/v1/reset-password.dto';
import { LoginResponseDto } from '../../../../auth/dto/v1/login-response.dto';
import { RegisterResponseDto } from '../../../../auth/dto/v1/register-response.dto';
import { ResetPasswordResponseDto } from '../../../../auth/dto/v1/reset-password-response.dto';
import { MessageResponseDto } from '../../../../auth/dto/v1/message-response.dto';
import { envelopeSchema } from '../../../../shared/utils/swagger-envelope.util';
import { JwtAuthGuard } from '../../../../shared/guards/jwt-auth.guard';
import { Request } from 'express';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthPublicController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse(
    envelopeSchema(LoginResponseDto, {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      expiresIn: 900,
    }),
  )
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'User registration' })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse(
    envelopeSchema(RegisterResponseDto, {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      expiresIn: 900,
    }),
  )
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'User logout' })
  @ApiBearerAuth()
  @ApiNoContentResponse(
    envelopeSchema(MessageResponseDto, {
      message: 'Did logout successfully',
    }),
  )
  async logout(@Req() req: Request & { user: { jti: string; exp: number } }) {
    const { jti, exp } = req.user;
    await this.authService.logout(jti, exp);
  }

  @Post('forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Send password reset email' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiAcceptedResponse(
    envelopeSchema(MessageResponseDto, {
      message: 'Email sent',
    }),
  )
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse(
    envelopeSchema(ResetPasswordResponseDto, {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      expiresIn: 900,
    }),
  )
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
