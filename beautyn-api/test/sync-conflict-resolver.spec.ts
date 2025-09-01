import { ConflictResolverService } from '../src/sync-reconciliation/conflict-resolver.service';
import { MergePolicyService } from '../src/sync-reconciliation/merge-policy.service';

describe('ConflictResolverService (service fields)', () => {
  const svc = new ConflictResolverService(new MergePolicyService());

  it('prefers APP for name/price/duration/category/active per default policy', async () => {
    const local = { name:'Haircut', priceMinor:2500, durationMin:30, categoryExternalId:'catA', isActive:true };
    const remote= { name:'Hair Cut', priceMinor:3000, durationMin:45, categoryExternalId:'catB', isActive:false };
    const dec = await (svc as any).serviceDecision('salon-1', local, remote);
    // Either push patch (APP) or noop if equal; but not a pure pull
    expect((dec as any).noop || (dec as any).pull).toBeFalsy();
  });
});

