export type EntityType = 'salon' | 'category' | 'service' | 'worker';
export type IntentOp = 'create' | 'update' | 'delete' | 'updateSchedule';
export type IntentStatus = 'pending' | 'running' | 'delivered' | 'error' | 'conflict';
export type SoT = 'APP' | 'CRM' | 'AUTO';

export type MergePolicy = {
  salon:     { name: SoT; description: SoT; photos: SoT; logo: SoT; address: SoT; timezone: SoT; workingSchedule: SoT; phone: SoT; email: SoT; location: SoT; };
  categories:{ name: SoT; parent: SoT; };
  services:  { name: SoT; price: SoT; currency: SoT; durationMin: SoT; category: SoT; active: SoT; description: SoT; };
  workers:   { name: SoT; avatar: SoT; phone: SoT; email: SoT; active: SoT; position: SoT; description: SoT; photoUrl: SoT; schedule: SoT; };
};

export type ShadowSnapshot = {
  provider: string;
  externalId: string;
  remote: any;
  remoteUpdatedAtIso?: string;
  remoteVersion?: string;
};

