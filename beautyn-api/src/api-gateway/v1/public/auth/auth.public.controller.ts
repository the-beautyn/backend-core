import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiCreatedResponse, ApiOkResponse, ApiNoContentResponse, ApiAcceptedResponse } from '@nestjs/swagger';
import { AuthService } from '../../../../auth/auth.service';
import { LoginDto } from '../../../../auth/dto/v1/login.dto';
import { RegisterDto } from '../../../../auth/dto/v1/register.dto';
import { ForgotPasswordDto } from '../../../../auth/dto/v1/forgot-password.dto';
import { ResetPasswordDto } from '../../../../auth/dto/v1/reset-password.dto';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthPublicController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse()
  async login(@Body() dto: LoginDto) {
    const data = await this.authService.login(dto);
    return { success: true, data };
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse()
  async register(@Body() dto: RegisterDto) {
    const data = await this.authService.register(dto);
    return { success: true, data };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async logout() {
    const data = await this.authService.logout();
    return { success: true, data };
  }

  @Post('forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiAcceptedResponse()
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const data = await this.authService.forgotPassword(dto);
    return { success: true, data };
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse()
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const data = await this.authService.resetPassword(dto);
    return { success: true, data };
  }
}
