import { CrmAdapterService } from '@crm/adapter';
import { CrmType } from '@crm/shared';

class CapsStub { assert() {/* no-op */} }
class SchedStub {
  last: any[] = [];
  async scheduleSync(x:any){ this.last.push(['initial', x]); return 'job-1'; }
  async scheduleCronDiff(x:any){ this.last.push(['cron', x]); return; }
}
class ProvStub {
  make(type: CrmType) {
    return {
      init: async ()=>{},
      createBooking: async ()=>({ externalBookingId: 'ext-1' }),
      rescheduleBooking: async ()=>{},
      cancelBooking: async ()=>{},
    };
  }
}

describe('CrmAdapterService (requestSync + ensureCronSync)', () => {
  const sched = new SchedStub();
  const svc = new CrmAdapterService(new CapsStub() as any, sched as any, new ProvStub() as any);

  it('requestSync enqueues a full sync immediately', async () => {
    const id = await svc.requestSync('salon-1', CrmType.ALTEGIO, 'rid-1');
    expect(id).toBe('job-1');
    expect(sched.last[0][0]).toBe('initial');
  });

  it('ensureCronSync schedules repeating sync with provided cron', async () => {
    await svc.ensureCronSync('salon-2', CrmType.EASYWEEK, '0 */2 * * *', 'Europe/Kyiv', 'rid-2');
    expect(sched.last.at(-1)[0]).toBe('cron');
    expect(sched.last.at(-1)[1].cron).toBe('0 */2 * * *');
  });

  it('createBooking delegates to provider', async () => {
    const res = await svc.createBooking('s', CrmType.EASYWEEK, { startAtIso: new Date().toISOString() } as any);
    expect(res.externalBookingId).toBe('ext-1');
  });
});

