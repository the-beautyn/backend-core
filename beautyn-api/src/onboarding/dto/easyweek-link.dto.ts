import { IsUUID, IsString } from 'class-validator';

export class EasyWeekLinkDto {
  @IsUUID()
  user_id!: string;

  @IsString()
  auth_token!: string;

  @IsString()
  workspace_slug!: string;

  @IsString()
  salon_uuid!: string;
}


