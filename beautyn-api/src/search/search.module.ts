import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { SearchService } from './search.service';
import { SearchQueryBuilderService } from './search-query-builder.service';
import { GeoLocationService } from './geo-location.service';
import { SearchHistoryService } from './search-history.service';
import { SearchSuggestionsService } from './search-suggestions.service';

@Module({
  imports: [SharedModule],
  providers: [
    SearchService,
    SearchQueryBuilderService,
    GeoLocationService,
    SearchHistoryService,
    SearchSuggestionsService,
  ],
  exports: [SearchService, SearchQueryBuilderService, SearchHistoryService, SearchSuggestionsService],
})
export class SearchModule {}
