import { IsUUID } from 'class-validator';

export class CrmLinkedDto {
  @IsUUID()
  user_id!: string;
}
