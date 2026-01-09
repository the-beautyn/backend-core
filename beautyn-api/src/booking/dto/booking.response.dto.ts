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
  salonId: string;
  userId: string | null;
  worker?: { id: string; firstName: string; lastName: string; photoUrl?: string | null } | null;
  status: string;
  datetime: string;
  endDatetime?: string | null;
  comment?: string | null;
  crmType?: string | null;
  crmRecordId?: string | null;
  crmCompanyId?: string | null;
  crmStaffId?: string | null;
  crmServiceIds?: string[];
  serviceIds?: string[];
  shortLink?: string | null;
  createdAt: string;
  updatedAt: string;
  providerSpecific?: {
    easyweek?: BookingProviderEasyweekDto;
    altegio?: BookingProviderAltegioDto;
  };
  history?: Array<{
    version: number;
    syncedAt: string;
    remoteUpdatedAt?: string | null;
    payload: any;
    diffFromPrev?: any;
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
  @ApiProperty() salonId!: string;
  @ApiPropertyOptional() userId?: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() datetime!: string;
  @ApiPropertyOptional() endDatetime?: string | null;
  @ApiPropertyOptional() comment?: string | null;
  @ApiPropertyOptional() crmType?: string | null;
  @ApiPropertyOptional() crmRecordId?: string | null;
  @ApiPropertyOptional() crmCompanyId?: string | null;
  @ApiPropertyOptional() crmStaffId?: string | null;
  @ApiPropertyOptional({ type: [String] }) crmServiceIds?: string[];
  @ApiPropertyOptional({ type: [String] }) serviceIds?: string[];
  @ApiPropertyOptional() shortLink?: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
  @ApiPropertyOptional({ type: () => BookingProviderSpecificDto })
  providerSpecific?: BookingProviderSpecificDto;
  @ApiPropertyOptional({ type: [BookingHistoryEntryDto] })
  history?: BookingHistoryEntryDto[];
}

export class BookingListResponseDtoClass {
  @ApiProperty({ type: [BookingResponseDto] }) items!: BookingResponseDto[];
  @ApiPropertyOptional() nextCursor?: string | null;
  @ApiProperty() limit!: number;
}
