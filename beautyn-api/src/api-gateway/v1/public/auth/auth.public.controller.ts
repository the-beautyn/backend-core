import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
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

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthPublicController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: { accessToken: '<jwt>', expiresIn: 900 },
      },
    },
    type: LoginResponseDto,
  })
  async login(@Body() dto: LoginDto) {
    const data = await this.authService.login(dto);
    return { success: true, data };
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'User registration' })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({
    schema: {
      example: {
        success: true,
        data: { id: 'uuid', email: 'user@example.com' },
      },
    },
  })
  async register(@Body() dto: RegisterDto) {
    const data = await this.authService.register(dto);
    return { success: true, data };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'User logout' })
  @ApiNoContentResponse()
  async logout() {
    await this.authService.logout();
  }

  @Post('forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Send password reset email' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiAcceptedResponse({
    schema: {
      example: { success: true, data: { message: 'Email sent' } },
    },
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const data = await this.authService.forgotPassword(dto);
    return { success: true, data };
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({
    schema: {
      example: { success: true, data: { message: 'Password updated' } },
    },
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const data = await this.authService.resetPassword(dto);
    return { success: true, data };
  }
}
