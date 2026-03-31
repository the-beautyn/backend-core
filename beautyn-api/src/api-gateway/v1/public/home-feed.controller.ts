import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { HomeFeedService } from '../../../home-feed/home-feed.service';
import { HomeFeedQueryDto } from '../../../home-feed/dto/home-feed-query.dto';
import { HomeFeedResponseDto } from '../../../home-feed/dto/home-feed-response.dto';
import { OptionalJwtAuthGuard } from '../../../shared/guards/optional-jwt-auth.guard';
import { envelopeRef } from '../../../shared/utils/swagger-envelope.util';

@ApiTags('Home Feed')
@Controller('api/v1/home')
export class HomeFeedController {
  constructor(private readonly homeFeedService: HomeFeedService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get home feed (optional auth)' })
  @ApiOkResponse(envelopeRef(HomeFeedResponseDto))
  async getHomeFeed(
    @Query() query: HomeFeedQueryDto,
    @Req() req: Request & { user?: { id?: string } | null },
  ): Promise<HomeFeedResponseDto> {
    return this.homeFeedService.getHomeFeed({
      userId: req.user?.id ?? null,
      latitude: query.lat,
      longitude: query.lon,
    });
  }
}
