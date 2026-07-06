import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { SavedSalonsModule } from '../saved-salons/saved-salons.module';
import { SearchService } from './search.service';
import { SearchQueryBuilderService } from './search-query-builder.service';
import { GeoLocationService } from './geo-location.service';
import { SearchHistoryService } from './search-history.service';

@Module({
  imports: [SharedModule, SavedSalonsModule],
  providers: [
    SearchService,
    SearchQueryBuilderService,
    GeoLocationService,
    SearchHistoryService,
  ],
  exports: [SearchService, SearchQueryBuilderService, SearchHistoryService],
})
export class SearchModule {}
