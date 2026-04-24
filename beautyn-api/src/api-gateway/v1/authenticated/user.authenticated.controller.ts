import {
  Controller,
  Get,
  Patch,
  Body,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { UserService } from '../../../user/user.service';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { UpdateUserDto } from '../../../user/dto/update-user.dto';
import { UserResponseDto } from '../../../user/dto/user-response.dto';
import { TransformUserResponseInterceptor } from '../../../user/interceptors/transform-user-response.interceptor';
import { envelopeRef, envelopeErrorSchema } from '../../../shared/utils/swagger-envelope.util';

@ApiTags('User')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(TransformUserResponseInterceptor)
@Controller('api/v1/user')
export class UserAuthenticatedController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
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
}