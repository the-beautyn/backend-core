import { ApiProperty } from '@nestjs/swagger';

export class SalonClientDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ required: false, nullable: true, example: 'Іван Петренко' })
  display_name!: string | null;

  @ApiProperty({ required: false, nullable: true, example: '+380950000012', description: 'E.164 when the CRM value parsed, else as the CRM sent it' })
  phone!: string | null;

  @ApiProperty({ required: false, nullable: true, example: 'ivan@example.com' })
  email!: string | null;

  @ApiProperty({ required: false, nullable: true })
  avatar_url!: string | null;

  @ApiProperty({ example: 12, description: 'Non-cancelled bookings, past and future' })
  bookings_count!: number;

  @ApiProperty({ required: false, nullable: true, type: String, format: 'date-time', description: 'Latest past non-cancelled booking' })
  last_visit_at!: string | null;

  @ApiProperty({ required: false, nullable: true, format: 'uuid', description: 'Beautyn account, when the client booked through the app' })
  user_id!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  created_at!: string;
}
