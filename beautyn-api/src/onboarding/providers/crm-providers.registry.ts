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
export interface CrmDescriptor {
  code: CrmCode;
  label: string;
  flow: CrmFlow;
  fields: CrmField[];
  capabilities: Array<'locations' | 'serviceCatalog' | 'workerRoster' | 'availabilityRealTime' | 'bookingWrite'>;
  docs_url?: string;
  icon_url?: string;
}
export class CrmProvidersRegistry {
  list(): CrmDescriptor[] {
    return [
      {
        code: 'EASYWEEK',
        label: 'EasyWeek',
        flow: 'token',
        fields: [
          { name: 'auth_token', label: 'API Token', type: 'password', required: true, placeholder: 'EW-****' },
          { name: 'workspace_slug', label: 'Workspace Slug', type: 'text', required: true, placeholder: 'acme-studio' },
        ],
        capabilities: ['locations', 'serviceCatalog', 'workerRoster'],
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
      },
    ];
  }
  get(code: CrmCode) {
    return this.list().find((p) => p.code === code);
  }
}
