import { Injectable } from '@nestjs/common';
import { SearchHistoryService } from './search-history.service';
import { SearchQueryBuilderService } from './search-query-builder.service';
import { SearchSuggestionDto } from './dto/search-suggestion.dto';

@Injectable()
export class SearchSuggestionsService {
  private readonly historyLimit = 10;
  private readonly suggestionsLimit = 10;

  constructor(
    private readonly historyService: SearchHistoryService,
    private readonly queryBuilder: SearchQueryBuilderService,
  ) {}

  async getSuggestions(userId: string | null, query?: string): Promise<SearchSuggestionDto[]> {
    const normalizedQuery = query?.trim() ?? '';
    const history = userId ? await this.historyService.getHistory(userId, this.historyLimit) : [];

    if (!normalizedQuery) {
      return history.map((item) => ({
        id: item.salonId,
        type: 'history',
        label: item.salonName,
        subtitle: item.city,
        logoUrl: item.logoUrl,
      }));
    }

    const lcQuery = normalizedQuery.toLowerCase();
    const matchesFromHistory = history.filter((item) =>
      item.salonName.toLowerCase().includes(lcQuery),
    );
    const salonRows = await this.queryBuilder.findSuggestions(normalizedQuery, this.suggestionsLimit);

    const seen = new Set<string>();
    const suggestions: SearchSuggestionDto[] = [];

    for (const item of matchesFromHistory) {
      if (seen.has(item.salonId)) continue;
      seen.add(item.salonId);
      suggestions.push({
        id: item.salonId,
        type: 'history',
        label: item.salonName,
        subtitle: item.city,
        logoUrl: item.logoUrl,
      });
    }

    for (const row of salonRows) {
      if (!row.id || seen.has(row.id)) continue;
      seen.add(row.id);
      suggestions.push({
        id: row.id,
        type: 'salon',
        label: row.name ?? '',
        subtitle: this.buildSubtitle(row.city, row.rating_avg, row.rating_count),
        logoUrl: row.cover_image_url ?? undefined,
      });
      if (suggestions.length >= this.suggestionsLimit) break;
    }

    return suggestions.slice(0, this.suggestionsLimit);
  }

  private buildSubtitle(city?: string | null, rating?: any, ratingCount?: number | null): string | undefined {
    const parts: string[] = [];
    if (city) parts.push(city);
    const ratingNumber = rating !== undefined && rating !== null ? Number(rating) : null;
    if (ratingNumber !== null && Number.isFinite(ratingNumber)) {
      parts.push(`${ratingNumber.toFixed(1)} ★${ratingCount ? ` · ${ratingCount}` : ''}`);
    }
    return parts.length ? parts.join(' · ') : undefined;
  }
}
