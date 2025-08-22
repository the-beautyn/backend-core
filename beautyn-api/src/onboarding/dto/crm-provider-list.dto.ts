import { ApiProperty } from '@nestjs/swagger';
import { CrmProviderDto } from './crm-provider.dto';

export class CrmProviderListResponseDto {
  @ApiProperty({ type: [CrmProviderDto] })
  providers!: CrmProviderDto[];
}
