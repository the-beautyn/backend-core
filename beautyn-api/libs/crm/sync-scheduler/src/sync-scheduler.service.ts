import { Injectable } from '@nestjs/common';
import { SyncJob, CronDiffJob, CronDiffJobWithSchedule, SYNC_QUEUE, JOB_SYNC, JOB_CRON_DIFF } from './types';

type BullQueueLike = {
  add: (name: string, data: unknown, opts?: any) => Promise<{ id: string | number } & any>;
  getRepeatableJobs?: (...args: any[]) => Promise<Array<{ key: string; name: string; id?: string; pattern?: string; tz?: string }>>;
  removeRepeatableByKey?: (key: string) => Promise<void>;
  removeRepeatable?: (name: string, repeat: { pattern: string; tz?: string }, jobId?: string) => Promise<void>;
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

  async scheduleCronDiff(job: CronDiffJobWithSchedule): Promise<void> {
    const id = `${JOB_CRON_DIFF}:${job.provider}:${job.salonId}`;
    const queue = this.getQueue();

    // Ensure re-scheduling actually updates existing repeat job
    try {
      const list = await (queue.getRepeatableJobs?.() ?? Promise.resolve([]));
      for (const r of list) {
        if (r.name === JOB_CRON_DIFF && r.id === id) {
          if (queue.removeRepeatableByKey) {
            await queue.removeRepeatableByKey(r.key);
          } else if (queue.removeRepeatable && r.pattern) {
            await queue.removeRepeatable(JOB_CRON_DIFF, { pattern: r.pattern, tz: r.tz }, id);
          }
        }
      }
    } catch {
      // best-effort cleanup; ignore removal errors
    }

    await queue.add(
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

