import { PartialType } from '@nestjs/swagger';
import { CreateHomeFeedSectionDto } from './create-home-feed-section.dto';

export class UpdateHomeFeedSectionDto extends PartialType(CreateHomeFeedSectionDto) {}
