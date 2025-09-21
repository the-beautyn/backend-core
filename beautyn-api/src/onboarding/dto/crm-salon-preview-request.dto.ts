import { IsEnum, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CrmType } from '@crm/shared';

export class CrmSalonPreviewRequestDto {
  @ApiProperty({ enum: ['ALTEGIO', 'EASYWEEK'] })
  @IsEnum(['ALTEGIO', 'EASYWEEK'] as unknown as CrmType[])
  provider!: CrmType;

  @ApiProperty({ example: '1315014' })
  @IsString()
  @Matches(/^[1-9]\d*$/)
  salon_id!: string;
}



