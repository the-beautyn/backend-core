import { IntentOp, IntentStatus } from './types';

export interface OutboxRow {
  id: string;
  salonId: string;
  entityType: 'salon'|'category'|'service'|'worker';
  entityId: string;
  provider: string;
  op: IntentOp;
  payload: any;
  idempotencyKey?: string;
  status: IntentStatus;
  attempts: number;
  nextRunAt?: string | null;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OutboxRepository {
  insert(row: Omit<OutboxRow,'status'|'attempts'|'createdAt'|'updatedAt'>): Promise<OutboxRow>;
  markRunning(id: string): Promise<void>;
  markDelivered(id: string): Promise<void>;
  markError(id: string, error: string, nextRunAtIso?: string): Promise<void>;
  getById(id: string): Promise<OutboxRow | null>;
}

