import { CrmType } from '@crm/shared';

export interface AltegioAccount { externalSalonId: number; }
export interface EasyWeekAccount { workspaceSlug: string; locationId: string; }

export type AnyAccountData = AltegioAccount | EasyWeekAccount;

export interface CrmAccountDto {
  salonId: string;
  provider: CrmType;
  data: AnyAccountData;
  createdAt: Date;
  updatedAt: Date;
}

