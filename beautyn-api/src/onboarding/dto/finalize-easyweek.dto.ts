import { IsString, IsNotEmpty } from 'class-validator';
export class FinalizeEasyWeekDto {
  @IsString()
  @IsNotEmpty()
  auth_token!: string;

  @IsString()
  @IsNotEmpty()
  workspace_slug!: string;

  @IsString()
  @IsNotEmpty()
  salon_uuid!: string;
}
