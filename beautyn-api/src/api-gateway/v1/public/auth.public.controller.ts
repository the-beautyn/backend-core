import {
  BadRequestException,
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
import { PhoneVerificationService } from '../../../auth/phone-verification.service';
import { UserService } from '../../../user/user.service';
import { LoginDto } from '../../../auth/dto/v1/login.dto';
import { RegisterDto } from '../../../auth/dto/v1/register.dto';
import { CheckEmailDto } from '../../../auth/dto/v1/check-email.dto';
import { CheckEmailResponseDto } from '../../../auth/dto/v1/check-email-response.dto';
import { OAuthSignInDto } from '../../../auth/dto/v1/oauth-sign-in.dto';
import { OAuthResponseDto } from '../../../auth/dto/v1/oauth-response.dto';
import { SendOtpDto } from '../../../auth/dto/v1/send-otp.dto';
import { VerifyOtpDto } from '../../../auth/dto/v1/verify-otp.dto';
import { VerifyOtpResponseDto } from '../../../auth/dto/v1/verify-otp-response.dto';
import { RefreshTokenDto } from '../../../auth/dto/v1/refresh-token.dto';
import { ForgotPasswordDto } from '../../../auth/dto/v1/forgot-password.dto';
import { ResetPasswordDto } from '../../../auth/dto/v1/reset-password.dto';
import { LoginResponseDto } from '../../../auth/dto/v1/login-response.dto';
import { RegisterResponseDto } from '../../../auth/dto/v1/register-response.dto';
import { ResetPasswordResponseDto } from '../../../auth/dto/v1/reset-password-response.dto';
import { envelopeRef, envelopeErrorSchema, envelopeSuccessOnly } from '../../../shared/utils/swagger-envelope.util';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { UserThrottlerGuard } from '../../../shared/guards/user-throttler.guard';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthPublicController {
  constructor(
    private readonly authService: AuthService,
    private readonly phoneVerification: PhoneVerificationService,
    private readonly userService: UserService,
  ) {}

  @Post('check-email')
  @UseGuards(UserThrottlerGuard)
  @Throttle({ 'email-check': {} })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if email is registered and how' })
  @ApiBody({ type: CheckEmailDto })
  @ApiOkResponse(envelopeRef(CheckEmailResponseDto))
  async checkEmail(@Body() dto: CheckEmailDto) {
    return this.authService.checkEmail(dto);
  }

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

  @Post('oauth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with Apple or Google ID token' })
  @ApiBody({ type: OAuthSignInDto })
  @ApiOkResponse(envelopeRef(OAuthResponseDto))
  @ApiBadRequestResponse(
    envelopeErrorSchema({ statusCode: 400, message: 'Bad Request', error: 'Bad Request' })
  )
  async oauthSignIn(@Body() dto: OAuthSignInDto) {
    return this.authService.oauthSignIn(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse(envelopeRef(LoginResponseDto))
  @ApiUnauthorizedResponse(
    envelopeErrorSchema({ statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' })
  )
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshSession(dto.refresh_token);
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

  @Post('forgot-password')
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

  @Post('phone/send-otp')
  @UseGuards(JwtAuthGuard, UserThrottlerGuard)
  @Throttle({ 'otp-burst': {}, 'otp-hour': {} })
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send phone verification OTP' })
  @ApiBody({ type: SendOtpDto })
  @ApiOkResponse(envelopeSuccessOnly())
  @ApiBadRequestResponse(
    envelopeErrorSchema({ statusCode: 400, message: 'Bad Request', error: 'Bad Request' })
  )
  async sendPhoneOtp(
    @Body() dto: SendOtpDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    await this.phoneVerification.sendOtp(req.user.id, dto.phone);
    return { success: true };
  }

  @Post('phone/verify-otp')
  @UseGuards(JwtAuthGuard, UserThrottlerGuard)
  @Throttle({ 'otp-verify': {} })
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify phone OTP code' })
  @ApiBody({ type: VerifyOtpDto })
  @ApiOkResponse(envelopeRef(VerifyOtpResponseDto))
  @ApiBadRequestResponse(
    envelopeErrorSchema({ statusCode: 400, message: 'Bad Request', error: 'Bad Request' })
  )
  async verifyPhoneOtp(
    @Body() dto: VerifyOtpDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    const valid = await this.phoneVerification.verifyOtp(req.user.id, dto.phone, dto.code);
    if (!valid) {
      throw new BadRequestException('Invalid or expired verification code');
    }
    await this.userService.setPhoneVerified(req.user.id, dto.phone);
    return { verified: true };
  }

  @Post('phone/resend-otp')
  @UseGuards(JwtAuthGuard, UserThrottlerGuard)
  @Throttle({ 'otp-burst': {}, 'otp-hour': {} })
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resend phone verification OTP' })
  @ApiBody({ type: SendOtpDto })
  @ApiOkResponse(envelopeSuccessOnly())
  async resendPhoneOtp(
    @Body() dto: SendOtpDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    await this.phoneVerification.sendOtp(req.user.id, dto.phone);
    return { success: true };
  }
}
