jest.mock('bullmq', () => {
  class FakeQueue {
    public jobs: any[] = [];
    constructor() {}
    async add(name: string, data: any, opts: any) {
      const id = opts?.jobId ?? `${name}-${Math.random()}`;
      this.jobs.push({ name, data, opts, id });
      return { id } as any;
    }
  }
  return { Queue: FakeQueue } as any;
}, { virtual: true });

import { SyncSchedulerService } from '@crm/sync-scheduler';
import { JOB_SYNC } from '@crm/sync-scheduler';

describe('SyncSchedulerService', () => {
  beforeAll(() => {
    process.env.REDIS_URL = 'redis://localhost:6379';
  });

  it('enqueues initial sync with deterministic jobId', async () => {
    const svc = new SyncSchedulerService();
    const id = await svc.scheduleSync({ salonId: 's', provider: 'ALTEGIO' as any });
    expect(id).toContain(`${JOB_SYNC}:ALTEGIO:s`);
  });

  it('schedules nightly diff with repeat options', async () => {
    const svc = new SyncSchedulerService();
    await expect(
      svc.scheduleCronDiff({ salonId: 's', provider: 'EASYWEEK' as any }),
    ).resolves.toBeUndefined();
  });
});
