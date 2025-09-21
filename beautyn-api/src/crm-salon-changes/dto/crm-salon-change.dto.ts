import { ApiProperty } from '@nestjs/swagger';
import { CrmSalonChangeStatus } from '@prisma/client';

export class CrmSalonChangeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  salon_id!: string;

  @ApiProperty()
  provider!: string;

  @ApiProperty()
  field_path!: string;

  @ApiProperty({ nullable: true })
  old_value!: unknown;

  @ApiProperty({ nullable: true })
  new_value!: unknown;

  @ApiProperty({ enum: CrmSalonChangeStatus })
  status!: CrmSalonChangeStatus;

  @ApiProperty()
  detected_at!: string;

  @ApiProperty({ nullable: true })
  decided_at?: string | null;

  @ApiProperty({ nullable: true })
  decided_by?: string | null;
}
