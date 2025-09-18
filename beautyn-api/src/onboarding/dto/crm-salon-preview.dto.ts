import { ApiProperty } from '@nestjs/swagger';

export class CrmSalonPreviewDto {
  @ApiProperty({ description: 'Raw salon object pulled from CRM' })
  salon!: any;
}



