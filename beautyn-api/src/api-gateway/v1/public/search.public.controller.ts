import { Controller, Get, Post, Query, Body, Req, ValidationPipe, UsePipes, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { SearchService } from '../../../search/search.service';
import { SearchRequestDto } from '../../../search/dto/search-request.dto';
import { SearchResultDto } from '../../../search/dto/search-response.dto';
import { envelopeErrorSchema, envelopeRef } from '../../../shared/utils/swagger-envelope.util';

@ApiTags('Search')
@Controller('api/v1/search')
export class SearchPublicController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search salons with geo/context filters (JSON body)' })
  @ApiOkResponse(envelopeRef(SearchResultDto))
  @ApiBadRequestResponse(
    envelopeErrorSchema({ statusCode: 400, message: 'Bad Request', error: 'Bad Request' }),
  )
  async searchPost(
    @Req() req: Request,
    @Body() dto: SearchRequestDto
  ) {
    return this.searchService.search(req, dto);
  }
}
