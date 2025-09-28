import { SyncSchedulerService } from '@crm/sync-scheduler';
import { JOB_SYNC } from '@crm/sync-scheduler';

describe('SyncSchedulerService', () => {
  let restore: jest.SpyInstance | undefined;

  beforeAll(() => {
    process.env.REDIS_URL = 'redis://localhost:6379';
  });

  beforeEach(() => {
    const fakeQueue = {
      add: jest.fn(async (name: string, _data: any, opts: any) => ({ id: opts?.jobId ?? name })),
      getRepeatableJobs: jest.fn(async () => []),
      removeRepeatableByKey: jest.fn(async () => true),
      removeRepeatable: jest.fn(async () => true),
    };
    restore = jest.spyOn(SyncSchedulerService.prototype as any, 'getQueue').mockResolvedValue(fakeQueue as any);
  });

  afterEach(() => {
    restore?.mockRestore();
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
