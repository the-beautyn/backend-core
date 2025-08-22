import { ApiProperty } from '@nestjs/swagger';

export class CrmFieldDto {
  @ApiProperty({ example: 'auth_token' })
  name!: string;

  @ApiProperty({ example: 'API Token' })
  label!: string;

  @ApiProperty({ example: 'password', enum: ['text', 'password'] })
  type!: 'text' | 'password';

  @ApiProperty({ example: true })
  required!: boolean;

  @ApiProperty({ example: 'EW-****', required: false })
  placeholder?: string;

  @ApiProperty({ example: 'Copy from EasyWeek account', required: false })
  helper_text?: string;
}

export class CrmProviderDto {
  @ApiProperty({ example: 'EASYWEEK', enum: ['EASYWEEK', 'ALTEGIO'] })
  code!: 'EASYWEEK' | 'ALTEGIO';

  @ApiProperty({ example: 'EasyWeek' })
  label!: string;

  @ApiProperty({ example: 'token', enum: ['token', 'pair_code'] })
  flow!: 'token' | 'pair_code';

  @ApiProperty({ type: [CrmFieldDto] })
  fields!: CrmFieldDto[];

  @ApiProperty({ type: [String], example: ['locations', 'serviceCatalog'] })
  capabilities!: string[];

  @ApiProperty({ required: false })
  docs_url?: string;

  @ApiProperty({ required: false })
  icon_url?: string;
}
