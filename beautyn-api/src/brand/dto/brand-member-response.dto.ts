import { ApiProperty } from '@nestjs/swagger';

export class BrandMemberResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  brand_id!: string;

  @ApiProperty()
  user_id!: string;

  @ApiProperty()
  role!: string;

  @ApiProperty({ required: false, nullable: true })
  last_selected_salon_id?: string | null;

  @ApiProperty()
  created_at!: Date;
}
