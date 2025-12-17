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
  supportsCategoriesSync: boolean;
  supportsServicesSync: boolean;
  supportsWorkersSync: boolean;

  /** WRITE (CRUD) */
  // Salon
  supportsSalonUpdate: boolean;

  // Categories
  supportsCategoryCrud: boolean;
  supportsCategoriesCreate: boolean;
  supportsCategoriesUpdate: boolean;
  supportsCategoriesDelete: boolean;

  // Services
  supportsServicesCreate: boolean;
  supportsServicesUpdate: boolean;
  supportsServicesDelete: boolean;
  supportsBulkUpsertServices: boolean;

  // Workers
  supportsWorkersPull: boolean;
  supportsWorkersCreate: boolean;
  supportsWorkersUpdate: boolean;
  supportsWorkersDelete: boolean;
  supportsWorkerScheduleUpdate: boolean;

  // Booking availability/create surfaces
  supportsBookingServicesPull: boolean;
  supportsBookingWorkersPull: boolean;
  supportsBookingDatesPull: boolean;
  supportsBookingTimeslotsPull: boolean;
  supportsBookingCreate: boolean;

  /** Optional metadata */
  timeGranularityMin?: number;
  authFlow?: 'oauth' | 'apiKey' | 'dual' | 'custom';
}

export type CapabilityMap = Record<CrmType, Capability>;
