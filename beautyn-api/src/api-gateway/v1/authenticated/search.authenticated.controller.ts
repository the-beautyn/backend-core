import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { SearchHistoryService } from '../../../search/search-history.service';
import { SearchHistoryItemDto } from '../../../search/dto/search-history-item.dto';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { envelopeArrayRef } from '../../../shared/utils/swagger-envelope.util';

@ApiTags('Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/search')
export class SearchAuthenticatedController {
  constructor(private readonly historyService: SearchHistoryService) {}

  @Get('history')
  @ApiOperation({ summary: 'Get visited salons history' })
  @ApiOkResponse(envelopeArrayRef(SearchHistoryItemDto))
  async history(@Req() req: Request & { user: { id: string } }, @Query('limit') limit?: number) {
    const safeLimit = this.normalizeLimit(limit);
    return this.historyService.getHistory(req.user.id, safeLimit);
  }

  @Delete('history')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear search history' })
  @ApiNoContentResponse()
  async clearHistory(@Req() req: Request & { user: { id: string } }) {
    await this.historyService.clearHistory(req.user.id);
    return;
  }

  @Delete('history/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete single history item' })
  @ApiNoContentResponse()
  async deleteHistory(@Req() req: Request & { user: { id: string } }, @Param('id') id: string) {
    await this.historyService.deleteHistoryItem(req.user.id, id);
    return;
  }

  private normalizeLimit(limit?: number): number {
    const value = Number(limit ?? 20);
    if (Number.isNaN(value) || value < 1) return 20;
    return Math.min(Math.floor(value), 50);
  }
}
