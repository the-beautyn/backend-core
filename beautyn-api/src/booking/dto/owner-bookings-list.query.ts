import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Query params for the owner booking list.
 *
 * Declared as a DTO rather than a row of bare `@Query()` args so the Swagger plugin
 * (`classValidatorShim`) emits them as genuinely optional and correctly typed. They
 * were previously undecorated, which made every one of them a required `string` in
 * the generated panel client. Validation comes along for free.
 */
export class OwnerBookingsListQueryDto {
  /**
   * Doubles as a tab selector: `created` (upcoming), `completed` (past) and
   * `canceled` (cancelled) are evaluated as datetime buckets, matching the client
   * app's tabs. Any other value falls back to a literal status match.
   */
  @ApiProperty({
    required: false,
    description: 'created | completed | canceled, or a raw status',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    required: false,
    description: 'ISO-8601 lower bound on datetime',
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiProperty({
    required: false,
    description: 'ISO-8601 upper bound on datetime',
  })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiProperty({ required: false, minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  /** Offset mode. Mutually exclusive with `cursor`; sending both is a 400. */
  @ApiProperty({
    required: false,
    minimum: 1,
    description: '1-based; cannot be combined with cursor',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  /** Cursor mode. Mutually exclusive with `page`. */
  @ApiProperty({
    required: false,
    description: 'Booking id to page from; cannot be combined with page',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiProperty({
    required: false,
    description: 'Comma-separated expansions. Supported: history',
  })
  @IsOptional()
  @IsString()
  included?: string;
}
