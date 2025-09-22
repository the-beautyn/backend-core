import { CapabilityRegistryService } from '../libs/crm/capability-registry/src/capability-registry.service';

describe('Capability defaults include CRUD flags', () => {
  it('has CRUD flags for both providers', () => {
    const registry = new CapabilityRegistryService();
    for (const provider of ['ALTEGIO', 'EASYWEEK'] as const) {
      const c = registry.get(provider as any);
      expect(c).toHaveProperty('supportsServicesCreate');
      expect(c).toHaveProperty('supportsServicesUpdate');
      expect(c).toHaveProperty('supportsServicesDelete');
      expect(c).toHaveProperty('supportsCategoryCrud');
      expect(c).toHaveProperty('supportsCategoriesCreate');
      expect(c).toHaveProperty('supportsWorkersUpdate');
      expect(c).toHaveProperty('supportsSalonUpdate');
    }
  });
});
