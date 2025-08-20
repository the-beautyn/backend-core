import { CrmIntegrationClient, LinkEasyWeekInput, LinkEasyWeekResult } from './crm-integration.client';
export class NoopCrmIntegrationClient implements CrmIntegrationClient {
  async linkEasyWeek(_: LinkEasyWeekInput): Promise<LinkEasyWeekResult> { return { jobId: 'job_dev_noop' }; }
  async enqueueInitialSync(_: string): Promise<void> { /* no-op */ }
}
