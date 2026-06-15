import { Injectable } from '@nestjs/common';
import { SyncJob, CronDiffJob, CronDiffJobWithSchedule, Lane, SYNC_QUEUE, CATEGORIES_QUEUE, SERVICES_QUEUE, WORKERS_QUEUE, CRON_DIFF_QUEUE, BOOKINGS_QUEUE, SALONS_QUEUE, JOB_SYNC, JOB_CRON_DIFF, JOB_SYNC_DISPATCH } from './types';

type BullQueueLike = {
  add: (name: string, data: unknown, opts?: any) => Promise<{ id: string | number } & any>;
  getRepeatableJobs?: (...args: any[]) => Promise<Array<{ key: string; name: string; id?: string | null; pattern?: string | null; tz?: string | null }>>;
  removeRepeatableByKey?: (key: string) => Promise<boolean>;
  removeRepeatable?: (name: string, repeat: { pattern: string; tz?: string }, jobId?: string | null) => Promise<boolean>;
};

async function makeQueue(name: string): Promise<BullQueueLike> {
  const { REDIS_URL } = process.env;
  if (!REDIS_URL) throw new Error('REDIS_URL is required');
  const { Queue } = await import('bullmq');
  const limiterMax = Number.parseInt(process.env.CRM_SYNC_RATE_MAX ?? '') || undefined;
  const limiterDuration = Number.parseInt(process.env.CRM_SYNC_RATE_DURATION_MS ?? '') || undefined;
  const limiter = limiterMax && limiterDuration ? { max: limiterMax, duration: limiterDuration } : undefined;
  return new Queue(name, { connection: { url: REDIS_URL }, ...(limiter ? { limiter } : {}) });
}

@Injectable()
export class SyncSchedulerService {
  private queues: Record<string, BullQueueLike> = {};

  private async getQueue(name: string): Promise<BullQueueLike> {
    if (!this.queues[name]) this.queues[name] = await makeQueue(name);
    return this.queues[name];
  }

  async scheduleSync(job: SyncJob, opts?: { type?: 'initial' | 'categories' | 'services' | 'workers' | 'bookings' | 'salon' }): Promise<string> {
    const type = opts?.type ?? 'initial';
    const queueName =
      type === 'categories'
        ? CATEGORIES_QUEUE
        : type === 'services'
          ? SERVICES_QUEUE
          : type === 'workers'
            ? WORKERS_QUEUE
            : type === 'bookings'
              ? BOOKINGS_QUEUE
              : type === 'salon'
                ? SALONS_QUEUE
              : SYNC_QUEUE;
    // Lane (when present) is part of the jobId so fast/slow are distinct jobs: same-lane re-ticks
    // dedup while one is still running (overlap protection), but fast never dedups against slow.
    const lanePart = job.lane ? `${job.lane}:` : '';
    const id = `${JOB_SYNC}:${type}:${lanePart}${job.provider}:${job.salonId}`;
    // Lower priority number = served first. Fast jumps ahead of queued slow jobs.
    const priority = job.lane === 'fast' ? 1 : job.lane === 'slow' ? 5 : undefined;
    const res = await (await this.getQueue(queueName)).add(JOB_SYNC, job, {
      jobId: id,
      attempts: 5,
      removeOnComplete: true,
      removeOnFail: false,
      ...(priority ? { priority } : {}),
    });
    return res.id as string;
  }

  // Register the two repeatable sync-dispatch ticks (fast / slow) on the cron-diff queue.
  // Idempotent: removes any prior dispatch repeatables first so interval changes take effect.
  // Each tick fans out to per-salon sync jobs via the internal /sync/dispatch endpoint.
  async registerSyncLaneSchedules(): Promise<void> {
    const queue = await this.getQueue(CRON_DIFF_QUEUE);
    const fastEvery = Number.parseInt(process.env.BOOKINGS_FASTLANE_EVERY_MS ?? '') || 120000; // 2 min
    const slowEvery = Number.parseInt(process.env.BOOKINGS_SLOWLANE_EVERY_MS ?? '') || 5400000; // 90 min
    const lanes: Array<{ lane: Lane; every: number }> = [
      { lane: 'fast', every: fastEvery },
      { lane: 'slow', every: slowEvery },
    ];

    try {
      const list = await (queue.getRepeatableJobs?.() ?? Promise.resolve([]));
      for (const r of list) {
        if (r.name === JOB_SYNC_DISPATCH && queue.removeRepeatableByKey) {
          await queue.removeRepeatableByKey(r.key);
        }
      }
    } catch {
      // best-effort cleanup; ignore removal errors
    }

    for (const { lane, every } of lanes) {
      await queue.add(
        JOB_SYNC_DISPATCH,
        { lane },
        {
          jobId: `${JOB_SYNC_DISPATCH}:${lane}`,
          repeat: { every },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    }
  }

  async scheduleCronDiff(job: CronDiffJobWithSchedule): Promise<void> {
    const id = `${JOB_CRON_DIFF}:${job.provider}:${job.salonId}`;
    const queue = await this.getQueue(CRON_DIFF_QUEUE);

    // Ensure re-scheduling actually updates existing repeat job
    try {
      const list = await (queue.getRepeatableJobs?.() ?? Promise.resolve([]));
      for (const r of list) {
        if (r.name === JOB_CRON_DIFF && r.id === id) {
          if (queue.removeRepeatableByKey) {
            await queue.removeRepeatableByKey(r.key);
          } else if (queue.removeRepeatable && r.pattern) {
            await queue.removeRepeatable(JOB_CRON_DIFF, { pattern: r.pattern, tz: r.tz ?? undefined }, (r.id ?? id) ?? undefined);
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
        repeat: { pattern: job.cron ?? '0 2 * * *', tz: job.tz },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }
}
