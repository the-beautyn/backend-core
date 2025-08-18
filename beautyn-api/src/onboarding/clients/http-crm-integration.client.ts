import { CrmIntegrationClient, LinkEasyWeekInput, LinkEasyWeekResult } from './crm-integration.client';

export class HttpCrmIntegrationClient implements CrmIntegrationClient {
  private readonly base = process.env.CRM_INTEGRATION_BASE_URL!;
  private readonly key = process.env.INTERNAL_API_KEY!;

  private headers() {
    return { 'content-type': 'application/json', 'x-internal-key': this.key } as Record<string,string>;
  }

  async linkEasyWeek(input: LinkEasyWeekInput): Promise<LinkEasyWeekResult> {
    const res = await fetch(`${this.base}/internal/crm/easyweek/link`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        salon_id: input.salonId,
        auth_token: input.authToken,
        workspace_slug: input.workspaceSlug,
        salon_uuid: input.externalSalonUuid,
      }),
    });
    if (!res.ok) throw new Error(`CRM_LINK_${res.status}_${await res.text().catch(()=> 'UNKNOWN_ERROR')}`);
    const data = await res.json();
    return { jobId: data.job_id };
  }

  async enqueueInitialSync(salonId: string): Promise<void> {
    const res = await fetch(`${this.base}/internal/crm/sync/initial`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ salon_id: salonId }),
    });
    if (!res.ok) throw new Error(`CRM_SYNC_${res.status}_${await res.text().catch(()=> 'UNKNOWN_ERROR')}`);
  }
}
