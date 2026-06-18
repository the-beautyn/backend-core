import { ArrayNotEmpty, IsArray, IsNotEmpty, IsOptional, IsString, IsUrl, IsUUID } from 'class-validator';
export class FinalizeEasyWeekDto {
  @IsString()
  @IsNotEmpty()
  auth_token!: string;

  @IsString()
  @IsNotEmpty()
  workspace_slug!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  salon_uuids!: string[];

  // Optional booking widget URL. When omitted, the backend derives it from the workspace slug.
  @IsOptional()
  @IsString()
  @IsUrl()
  widget_url?: string;
}
