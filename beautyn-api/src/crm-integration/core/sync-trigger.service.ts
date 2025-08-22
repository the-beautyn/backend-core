import { Injectable } from '@nestjs/common';

@Injectable()
export class SyncTriggerService {
  private readonly base = process.env.INTERNAL_API_BASE_URL;
  private readonly key = process.env.INTERNAL_API_KEY;

  async triggerInitialSync({ salonId, provider }: { salonId: string; provider: string }): Promise<void> {
    if (!this.base || !this.key) return;
    try {
      await fetch(`${this.base}/internal/crm/sync/initial`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-internal-key': this.key },
        body: JSON.stringify({ salon_id: salonId, provider }),
      });
    } catch (_) {
      // ignore failures
    }
  }
}
