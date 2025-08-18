import { IsString, IsNotEmpty } from 'class-validator';
export class DiscoverEasyWeekDto {
  @IsString()
  @IsNotEmpty()
  auth_token!: string;

  @IsString()
  @IsNotEmpty()
  workspace_slug!: string;
}
