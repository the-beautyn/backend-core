import { CrmType } from '@crm/shared';

export interface Capability {
  /** Provider can push events to us */
  webhooks: boolean;
  /** Recommended page size / batch size for pulls */
  batchSize: number;
  /** Booking lifecycle */
  supportsBooking: boolean;
  supportsReschedule: boolean;
  supportsCancelBooking: boolean;

  /** Sync surfaces */
  supportsSalonSync: boolean;
  supportsServicesSync: boolean;
  supportsWorkersSync: boolean;
}

export type CapabilityMap = Record<CrmType, Capability>;

