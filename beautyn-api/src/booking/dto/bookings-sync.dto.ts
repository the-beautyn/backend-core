import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import type { AltegioBooking } from '@crm/provider-core/altegio/bookings';
import type { EasyWeekBooking } from '@crm/provider-core/easyweek/bookings';

class AltegioBookingPayload implements AltegioBooking {
  @ApiProperty()
  @IsOptional()
  crmRecordId?: string | null;
  @ApiProperty()
  @IsOptional()
  companyId?: string | null;
  @ApiProperty()
  @IsOptional()
  staffId?: string | null;
  @ApiProperty()
  @IsOptional()
  clientId?: string | null;
  @ApiProperty()
  @IsOptional()
  datetime?: string | null;
  @ApiProperty()
  @IsOptional()
  date?: string | null;
  @ApiProperty()
  @IsOptional()
  comment?: string | null;
  @ApiProperty()
  @IsOptional()
  attendance?: number | null;
  @ApiProperty()
  @IsOptional()
  confirmed?: number | null;
  @ApiProperty()
  @IsOptional()
  visitAttendance?: number | null;
  @ApiProperty()
  @IsOptional()
  length?: number | null;
  @ApiProperty()
  @IsOptional()
  seanceLength?: number | null;
  @ApiProperty()
  @IsOptional()
  isDeleted?: boolean | null;
  @ApiProperty()
  @IsOptional()
  staff?: any;
  @ApiProperty()
  @IsOptional()
  client?: any;
  @ApiProperty()
  @IsOptional()
  services?: any;
  @ApiProperty()
  @IsOptional()
  documents?: any;
  @ApiProperty()
  @IsOptional()
  goodsTransactions?: any;
  @ApiProperty()
  @IsOptional()
  raw?: any;
}

class EasyweekBookingPayload implements EasyWeekBooking {
  @ApiProperty()
  @IsString()
  uuid!: string;
  @ApiProperty({ required: false })
  @IsOptional()
  locationUuid?: string | null;
  @ApiProperty({ required: false })
  @IsOptional()
  startTime?: string | null;
  @ApiProperty({ required: false })
  @IsOptional()
  endTime?: string | null;
  @ApiProperty({ required: false })
  @IsOptional()
  timezone?: string | null;
  @ApiProperty({ required: false })
  @IsOptional()
  isCanceled?: boolean;
  @ApiProperty({ required: false })
  @IsOptional()
  isCompleted?: boolean;
  @ApiProperty({ required: false })
  @IsOptional()
  statusName?: string | null;
  @ApiProperty({ required: false })
  @IsOptional()
  publicNotes?: string | null;
  @ApiProperty({ required: false, type: [Object] })
  @IsOptional()
  orderedServices?: any[];
  @ApiProperty({ required: false })
  @IsOptional()
  order?: any;
  @ApiProperty({ required: false })
  @IsOptional()
  duration?: any;
  @ApiProperty({ required: false })
  @IsOptional()
  policy?: any;
  @ApiProperty({ required: false })
  @IsOptional()
  links?: any;
  @ApiProperty({ required: false })
  @IsOptional()
  raw?: any;
}

export class AltegioBookingsSyncDto {
  @ApiProperty()
  @IsUUID()
  salon_id!: string;

  @ApiProperty({ type: [AltegioBookingPayload] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AltegioBookingPayload)
  bookings!: AltegioBooking[];
}

export class EasyweekBookingsSyncDto {
  @ApiProperty()
  @IsUUID()
  salon_id!: string;

  @ApiProperty({ type: [EasyweekBookingPayload] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EasyweekBookingPayload)
  bookings!: EasyWeekBooking[];
}
