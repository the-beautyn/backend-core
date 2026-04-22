import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type BookingProviderEasyweekDto = {
  booking_uuid?: string | null;
  location_uuid?: string | null;
  timezone?: string | null;
  status_name?: string | null;
  is_canceled?: boolean;
  is_completed?: boolean;
  links?: Array<{ type: string | null; url: string }>;
  duration?: { value?: number | null; label?: string | null; iso8601?: string | null };
  ordered_services?: Array<{
    external_uuid?: string | null;
    reserved_on?: string | null;
    reserved_until?: string | null;
    timezone?: string | null;
    quantity?: number | null;
    name?: string | null;
    description?: string | null;
    currency?: string | null;
    price?: number | null;
    price_formatted?: string | null;
    discount?: number | null;
    discount_formatted?: string | null;
    original_price?: number | null;
    original_price_formatted?: string | null;
    duration_value?: number | null;
    duration_label?: string | null;
    duration_iso?: string | null;
    original_duration_value?: number | null;
    original_duration_label?: string | null;
    original_duration_iso?: string | null;
  }>;
  order?: {
    tax?: unknown;
    subtotal?: number | null;
    subtotal_formatted?: string | null;
    amount_paid?: number | null;
    amount_paid_formatted?: string | null;
    total?: number | null;
    total_formatted?: string | null;
  };
};

export type BookingProviderAltegioDto = {
  crm_record_id?: string | null;
  company_id?: string | null;
  staff_id?: string | null;
  client_id?: string | null;
  datetime?: string | null;
  date?: string | null;
  comment?: string | null;
  attendance?: number | null;
  confirmed?: number | null;
  visit_attendance?: number | null;
  length?: number | null;
  seance_length?: number | null;
  is_deleted?: boolean | null;
  staff?: {
    external_id?: string | null;
    api_id?: string | null;
    name?: string | null;
    specialization?: string | null;
    avatar?: string | null;
    avatar_big?: string | null;
    rating?: number | null;
    votes_count?: number | null;
  } | null;
  client?: {
    external_id?: string | null;
    display_name?: string | null;
    phone?: string | null;
    email?: string | null;
    discount?: number | null;
  } | null;
  services?: Array<{
    external_id?: string | null;
    title?: string | null;
    cost?: number | null;
    cost_to_pay?: number | null;
    discount?: number | null;
  }>;
  documents?: Array<{
    external_id?: string | null;
    type_id?: number | null;
    storage_id?: number | null;
    user_id?: number | null;
    company_id?: number | null;
    number?: number | null;
    comment?: string | null;
    date_created?: string | null;
  }>;
  goods_transactions?: Array<{
    external_id?: string | null;
    type_id?: number | null;
    storage_id?: number | null;
    user_id?: number | null;
    company_id?: number | null;
    number?: number | null;
    comment?: string | null;
    date_created?: string | null;
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
  next_cursor?: string | null;
  limit: number;
};

export class BookingProviderEasyweekResponseDto {
  @ApiPropertyOptional() booking_uuid?: string | null;
  @ApiPropertyOptional() location_uuid?: string | null;
  @ApiPropertyOptional() timezone?: string | null;
  @ApiPropertyOptional() status_name?: string | null;
  @ApiPropertyOptional() is_canceled?: boolean;
  @ApiPropertyOptional() is_completed?: boolean;
}

export class BookingProviderAltegioResponseDto {
  @ApiPropertyOptional() crm_record_id?: string | null;
  @ApiPropertyOptional() company_id?: string | null;
  @ApiPropertyOptional() staff_id?: string | null;
  @ApiPropertyOptional() client_id?: string | null;
  @ApiPropertyOptional() datetime?: string | null;
  @ApiPropertyOptional() date?: string | null;
  @ApiPropertyOptional() comment?: string | null;
}

export class BookingHistoryEntryDto {
  @ApiProperty() version!: number;
  @ApiProperty() synced_at!: string;
  @ApiPropertyOptional() remote_updated_at?: string | null;
  @ApiPropertyOptional({ type: Object }) payload?: any;
  @ApiPropertyOptional({ type: Object }) diff_from_prev?: any;
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
  @ApiPropertyOptional() next_cursor?: string | null;
  @ApiProperty() limit!: number;
}
