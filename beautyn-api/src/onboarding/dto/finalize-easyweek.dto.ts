import { ArrayNotEmpty, IsArray, IsNotEmpty, IsString, IsUUID } from 'class-validator';
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
}
