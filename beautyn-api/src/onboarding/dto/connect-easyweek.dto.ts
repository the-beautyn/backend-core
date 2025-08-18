import { IsUUID, IsString } from 'class-validator';
export class ConnectEasyWeekDto {
  @IsUUID()
  salon_id: string;

  @IsString()
  auth_token: string;
}
