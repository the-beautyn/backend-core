import { IsString, IsUUID } from 'class-validator';

export class AltegioLinkDto {
  @IsUUID()
  user_id!: string;

  @IsString()
  salon_uuid!: string;
}


