import { ApiPropertyOptional } from '@nestjs/swagger';

export class BookingsPullQuery {
  @ApiPropertyOptional({ description: 'Vendor external client id', type: String })
  client_external_id?: string;

  @ApiPropertyOptional({ description: 'Include deleted/canceled records', type: Boolean })
  with_deleted?: boolean;

  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)', type: String })
  start_date?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)', type: String })
  end_date?: string;

  @ApiPropertyOptional({ description: 'Page number (1-based)', type: Number })
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', type: Number })
  count?: number;
}


