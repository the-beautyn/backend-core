import { Injectable } from '@nestjs/common';
import { SyncJob, CronDiffJob, SYNC_QUEUE, JOB_SYNC, JOB_CRON_DIFF } from './types';

type BullQueueLike = {
  add: (name: string, data: unknown, opts?: any) => Promise<{ id: string | number } & any>;
};

function makeQueue(): BullQueueLike {
  const { REDIS_URL } = process.env;
  if (!REDIS_URL) throw new Error('REDIS_URL is required');
  // Lazy require to avoid hard dependency during tests when mocked
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Queue } = require('bullmq');
  return new Queue(SYNC_QUEUE, { connection: { url: REDIS_URL } });
}

@Injectable()
export class SyncSchedulerService {
  private queue?: BullQueueLike;

  private getQueue(): BullQueueLike {
    if (!this.queue) this.queue = makeQueue();
    return this.queue;
  }

  async scheduleSync(job: SyncJob): Promise<string> {
    const id = `${JOB_SYNC}:${job.provider}:${job.salonId}`;
    const res = await this.getQueue().add(JOB_SYNC, job, { jobId: id, attempts: 5 });
    return res.id as string;
  }

  async scheduleCronDiff(job: CronDiffJob & { cron?: string; tz?: string }): Promise<void> {
    const id = `${JOB_CRON_DIFF}:${job.provider}:${job.salonId}`;
    await this.getQueue().add(
      JOB_CRON_DIFF,
      job,
      {
        jobId: id,
        repeat: { pattern: job.cron ?? (process.env.CRM_SYNC_DEFAULT_CRON ?? '0 2 * * *'), tz: job.tz },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }
}

