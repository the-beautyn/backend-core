export interface LinkEasyWeekInput {
  salonId: string;
  authToken: string;
  workspaceSlug: string;
  externalSalonUuid: string;
}
export interface LinkEasyWeekResult { jobId: string; }

export abstract class CrmIntegrationClient {
  abstract linkEasyWeek(input: LinkEasyWeekInput): Promise<LinkEasyWeekResult>;
  abstract enqueueInitialSync(salonId: string): Promise<void>;
}
