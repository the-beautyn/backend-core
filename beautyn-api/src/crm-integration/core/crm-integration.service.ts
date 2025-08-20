import { Injectable } from '@nestjs/common';

@Injectable()
export class CrmIntegrationService {
  async linkAltegio({ salonId, externalSalonId }: { salonId: string; externalSalonId: string }): Promise<void> {
    return;
  }

  async enqueueInitialSync(salonId: string): Promise<void> {
    return;
  }
}
