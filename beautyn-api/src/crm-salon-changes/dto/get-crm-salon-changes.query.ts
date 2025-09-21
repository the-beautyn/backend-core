import { CrmSalonChangeStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class GetCrmSalonChangesQuery {
  @IsUUID()
  salonId!: string;

  @IsOptional()
  @IsEnum(CrmSalonChangeStatus)
  status?: CrmSalonChangeStatus;
}
