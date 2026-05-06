import { Controller, Post, Body, Req, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { SearchService } from '../../../search/search.service';
import { SearchRequestDto } from '../../../search/dto/search-request.dto';
import { SearchResultDto } from '../../../search/dto/search-response.dto';
import { OptionalJwtAuthGuard } from '../../../shared/guards/optional-jwt-auth.guard';
import { envelopeErrorSchema, envelopeRef } from '../../../shared/utils/swagger-envelope.util';

@ApiTags('Search')
@Controller('api/v1/search')
export class SearchPublicController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Search salons with geo/context filters (JSON body)' })
  @ApiOkResponse(envelopeRef(SearchResultDto))
  @ApiBadRequestResponse(
    envelopeErrorSchema({ statusCode: 400, message: 'Bad Request', error: 'Bad Request' }),
  )
  async searchPost(
    @Req() req: Request & { user?: { id?: string } | null },
    @Body() dto: SearchRequestDto
  ) {
    const userId = req.user?.id ?? null;
    return this.searchService.search(req, dto, userId);
  }
}
