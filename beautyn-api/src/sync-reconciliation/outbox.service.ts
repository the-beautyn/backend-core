import { Injectable } from '@nestjs/common';
import type { OutboxRepository } from './outbox.repository';
import { IntentOp } from './types';
import { randomUUID } from 'node:crypto';

type EnqueueArgs = {
  salonId: string; entityType: 'salon'|'category'|'service'|'worker'; entityId: string; provider: string;
  op: IntentOp; payload: any; idempotencyKey?: string; requestId?: string;
};

@Injectable()
export class OutboxService {
  private queue: any;
  constructor(private readonly repo: OutboxRepository) {
    const { REDIS_URL } = process.env;
    if (!REDIS_URL) throw new Error('REDIS_URL required');
    // Lazy require so tests can mock 'bullmq' without type deps
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Queue } = require('bullmq');
    this.queue = new Queue('crm-outbox', { connection: { url: REDIS_URL } });
  }

  async enqueue(args: EnqueueArgs): Promise<{ intentId: string }> {
    const row = await this.repo.insert({
      id: randomUUID(),
      salonId: args.salonId,
      entityType: args.entityType,
      entityId: args.entityId,
      provider: args.provider,
      op: args.op,
      payload: args.payload,
      idempotencyKey: args.idempotencyKey,
    });
    await this.queue.add('intent', { intentId: row.id, requestId: args.requestId }, { jobId: row.id, attempts: 1 });
    return { intentId: row.id };
  }
}

