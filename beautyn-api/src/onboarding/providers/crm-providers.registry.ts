export type CrmCode = 'EASYWEEK' | 'ALTEGIO';
export type CrmFlow = 'token' | 'pair_code';
export type CrmFieldType = 'text' | 'password';
export interface CrmField {
  name: 'auth_token' | 'workspace_slug' | 'pair_code';
  label: string;
  type: CrmFieldType;
  required: boolean;
  placeholder?: string;
  helper_text?: string;
}
export interface CrmProviderLinks {
  // Provider cabinet/marketplace page the owner opens to get credentials or install the app.
  external_url: string;
  instruction_url?: string;
  booking_instruction_url?: string;
}
export interface CrmDescriptor {
  code: CrmCode;
  label: string;
  flow: CrmFlow;
  fields: CrmField[];
  capabilities: Array<'locations' | 'serviceCatalog' | 'workerRoster' | 'availabilityRealTime' | 'bookingWrite'>;
  links: CrmProviderLinks;
  docs_url?: string;
  icon_url?: string;
}
function easyWeekLinks(): CrmProviderLinks {
  return {
    external_url: process.env.EASYWEEK_EXTERNAL_URL?.trim() || 'https://my.easyweek.io/settings/developers/api',
    booking_instruction_url:
      process.env.EASYWEEK_BOOKING_INSTRUCTION_URL?.trim() ||
      'https://my.easyweek.io/online/website/overview',
  };
}

function altegioLinks(): CrmProviderLinks {
  const explicit = process.env.ALTEGIO_EXTERNAL_URL?.trim();
  const appId = process.env.ALTEGIO_APPLICATION_ID?.trim();
  return {
    external_url: explicit || (appId ? `https://app.alteg.io/apps/${encodeURIComponent(appId)}` : 'https://app.alteg.io/apps'),
  };
}

export class CrmProvidersRegistry {
  list(): CrmDescriptor[] {
    return [
      {
        code: 'EASYWEEK',
        label: 'EasyWeek',
        flow: 'token',
        fields: [
          { name: 'auth_token', label: 'API Token', type: 'password', required: true, placeholder: 'secret_****' },
          { name: 'workspace_slug', label: 'Workspace Slug', type: 'text', required: true, placeholder: 'acme-studio' },
        ],
        capabilities: ['locations', 'serviceCatalog', 'workerRoster'],
        links: easyWeekLinks(),
      },
      {
        code: 'ALTEGIO',
        label: 'Altegio',
        flow: 'pair_code',
        fields: [
          {
            name: 'pair_code',
            label: '6-digit pairing code',
            type: 'text',
            required: true,
            placeholder: '123456',
            helper_text: 'Generate in the app, valid ~10 minutes',
          },
        ],
        capabilities: ['serviceCatalog', 'workerRoster'],
        links: altegioLinks(),
      },
    ];
  }
  get(code: string) {
    const normalized = code?.toUpperCase();
    return this.list().find((p) => p.code === normalized);
  }
}
