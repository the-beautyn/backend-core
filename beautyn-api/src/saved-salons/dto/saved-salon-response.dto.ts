export class SavedSalonItemDto {
  id!: string;
  salonId!: string;
  salonName!: string;
  coverImageUrl?: string | null;
  addressLine?: string | null;
  city?: string | null;
  ratingAvg?: number | null;
  ratingCount?: number | null;
  savedAt!: string;
}

export class SavedSalonListResponseDto {
  items!: SavedSalonItemDto[];
  page!: number;
  limit!: number;
  total!: number;
}
