import { IsUUID, IsIn } from 'class-validator';

export class CrmLinkedDto {
  @IsUUID()
  salon_id!: string;

  @IsIn(['ALTEGIO', 'EASYWEEK'])
  provider!: 'ALTEGIO' | 'EASYWEEK';
}
