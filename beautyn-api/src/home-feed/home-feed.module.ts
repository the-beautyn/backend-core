import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { AppCategoriesModule } from '../app-categories/app-categories.module';
import { SavedSalonsModule } from '../saved-salons/saved-salons.module';
import { SearchModule } from '../search/search.module';
import { HomeFeedSectionConfigRepository } from './home-feed-section-config.repository';
import { HomeFeedSectionConfigService } from './home-feed-section-config.service';
import { HomeFeedService } from './home-feed.service';

@Module({
  imports: [SharedModule, AppCategoriesModule, SavedSalonsModule, SearchModule],
  providers: [HomeFeedSectionConfigRepository, HomeFeedSectionConfigService, HomeFeedService],
  exports: [HomeFeedService, HomeFeedSectionConfigService],
})
export class HomeFeedModule {}
