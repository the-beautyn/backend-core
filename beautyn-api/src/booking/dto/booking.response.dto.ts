import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type BookingProviderEasyweekDto = {
  bookingUuid?: string | null;
  locationUuid?: string | null;
  timezone?: string | null;
  statusName?: string | null;
  isCanceled?: boolean;
  isCompleted?: boolean;
  links?: Array<{ type: string | null; url: string }>;
  duration?: { value?: number | null; label?: string | null; iso8601?: string | null };
  orderedServices?: Array<{
    externalUuid?: string | null;
    reservedOn?: string | null;
    reservedUntil?: string | null;
    timezone?: string | null;
    quantity?: number | null;
    name?: string | null;
    description?: string | null;
    currency?: string | null;
    price?: number | null;
    priceFormatted?: string | null;
    discount?: number | null;
    discountFormatted?: string | null;
    originalPrice?: number | null;
    originalPriceFormatted?: string | null;
    durationValue?: number | null;
    durationLabel?: string | null;
    durationIso?: string | null;
    originalDurationValue?: number | null;
    originalDurationLabel?: string | null;
    originalDurationIso?: string | null;
  }>;
  order?: {
    tax?: unknown;
    subtotal?: number | null;
    subtotalFormatted?: string | null;
    amountPaid?: number | null;
    amountPaidFormatted?: string | null;
    total?: number | null;
    totalFormatted?: string | null;
  };
};

export type BookingProviderAltegioDto = {
  crmRecordId?: string | null;
  companyId?: string | null;
  staffId?: string | null;
  clientId?: string | null;
  datetime?: string | null;
  date?: string | null;
  comment?: string | null;
  attendance?: number | null;
  confirmed?: number | null;
  visitAttendance?: number | null;
  length?: number | null;
  seanceLength?: number | null;
  isDeleted?: boolean | null;
  staff?: {
    externalId?: string | null;
    apiId?: string | null;
    name?: string | null;
    specialization?: string | null;
    avatar?: string | null;
    avatarBig?: string | null;
    rating?: number | null;
    votesCount?: number | null;
  } | null;
  client?: {
    externalId?: string | null;
    displayName?: string | null;
    phone?: string | null;
    email?: string | null;
    discount?: number | null;
  } | null;
  services?: Array<{
    externalId?: string | null;
    title?: string | null;
    cost?: number | null;
    costToPay?: number | null;
    discount?: number | null;
  }>;
  documents?: Array<{
    externalId?: string | null;
    typeId?: number | null;
    storageId?: number | null;
    userId?: number | null;
    companyId?: number | null;
    number?: number | null;
    comment?: string | null;
    dateCreated?: string | null;
  }>;
  goodsTransactions?: Array<{
    externalId?: string | null;
    typeId?: number | null;
    storageId?: number | null;
    userId?: number | null;
    companyId?: number | null;
    number?: number | null;
    comment?: string | null;
    dateCreated?: string | null;
  }>;
};

export type BookingDto = {
  id: string;
  salon_id: string;
  user_id: string | null;
  worker?: { id: string; first_name: string; last_name: string; photo_url?: string | null } | null;
  status: string;
  datetime: string;
  end_datetime?: string | null;
  comment?: string | null;
  crm_type?: string | null;
  crm_record_id?: string | null;
  crm_company_id?: string | null;
  crm_staff_id?: string | null;
  crm_service_ids?: string[];
  service_ids?: string[];
  short_link?: string | null;
  created_at: string;
  updated_at: string;
  provider_specific?: {
    easyweek?: BookingProviderEasyweekDto;
    altegio?: BookingProviderAltegioDto;
  };
  history?: Array<{
    version: number;
    synced_at: string;
    remote_updated_at?: string | null;
    payload: any;
    diff_from_prev?: any;
  }>;
};

export type BookingListResponseDto = {
  items: BookingDto[];
  nextCursor?: string | null;
  limit: number;
};

export class BookingProviderEasyweekResponseDto {
  @ApiPropertyOptional() bookingUuid?: string | null;
  @ApiPropertyOptional() locationUuid?: string | null;
  @ApiPropertyOptional() timezone?: string | null;
  @ApiPropertyOptional() statusName?: string | null;
  @ApiPropertyOptional() isCanceled?: boolean;
  @ApiPropertyOptional() isCompleted?: boolean;
}

export class BookingProviderAltegioResponseDto {
  @ApiPropertyOptional() crmRecordId?: string | null;
  @ApiPropertyOptional() companyId?: string | null;
  @ApiPropertyOptional() staffId?: string | null;
  @ApiPropertyOptional() clientId?: string | null;
  @ApiPropertyOptional() datetime?: string | null;
  @ApiPropertyOptional() date?: string | null;
  @ApiPropertyOptional() comment?: string | null;
}

export class BookingHistoryEntryDto {
  @ApiProperty() version!: number;
  @ApiProperty() syncedAt!: string;
  @ApiPropertyOptional() remoteUpdatedAt?: string | null;
  @ApiPropertyOptional({ type: Object }) payload?: any;
  @ApiPropertyOptional({ type: Object }) diffFromPrev?: any;
}

export class BookingProviderSpecificDto {
  @ApiPropertyOptional({ type: () => BookingProviderEasyweekResponseDto })
  easyweek?: BookingProviderEasyweekResponseDto;

  @ApiPropertyOptional({ type: () => BookingProviderAltegioResponseDto })
  altegio?: BookingProviderAltegioResponseDto;
}

export class BookingResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() salon_id!: string;
  @ApiPropertyOptional() user_id?: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() datetime!: string;
  @ApiPropertyOptional() end_datetime?: string | null;
  @ApiPropertyOptional() comment?: string | null;
  @ApiPropertyOptional() crm_type?: string | null;
  @ApiPropertyOptional() crm_record_id?: string | null;
  @ApiPropertyOptional() crm_company_id?: string | null;
  @ApiPropertyOptional() crm_staff_id?: string | null;
  @ApiPropertyOptional({ type: [String] }) crm_service_ids?: string[];
  @ApiPropertyOptional({ type: [String] }) service_ids?: string[];
  @ApiPropertyOptional() short_link?: string | null;
  @ApiProperty() created_at!: string;
  @ApiProperty() updated_at!: string;
  @ApiPropertyOptional({ type: () => BookingProviderSpecificDto })
  provider_specific?: BookingProviderSpecificDto;
  @ApiPropertyOptional({ type: [BookingHistoryEntryDto] })
  history?: BookingHistoryEntryDto[];
}

export class BookingListResponseDtoClass {
  @ApiProperty({ type: [BookingResponseDto] }) items!: BookingResponseDto[];
  @ApiPropertyOptional() nextCursor?: string | null;
  @ApiProperty() limit!: number;
}
