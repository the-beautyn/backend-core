export interface EasyWeekLocation { uuid: string; name: string; }
export abstract class EasyWeekDiscoveryClient {
  abstract listLocations(authToken: string, workspaceSlug: string): Promise<EasyWeekLocation[]>;
}

export class HttpEasyWeekDiscoveryClient implements EasyWeekDiscoveryClient {
  private readonly base = 'https://my.easyweek.io/api/public/v2';
  async listLocations(authToken: string, workspaceSlug: string): Promise<EasyWeekLocation[]> {
    const headers = { 'Authorization': 'Bearer ' + authToken, 'Workspace': workspaceSlug } as Record<string,string>;
    const out: EasyWeekLocation[] = [];
    let url: string | null = `${this.base}/locations`;
    while (url) {
      const res = await fetch(url, { headers } as any);
      if (res.status === 401 || res.status === 403) throw new Error('EASYWEEK_UNAUTHORIZED');
      if (!res.ok) throw new Error(`EASYWEEK_HTTP_${res.status}`);
      const data = await res.json();
      const arr = (data?.data ?? []) as any[];
      for (const it of arr) out.push({ uuid: String(it.uuid), name: String(it.name ?? '') });
      url = data?.links?.next || null;
    }
    return out;
  }
}
