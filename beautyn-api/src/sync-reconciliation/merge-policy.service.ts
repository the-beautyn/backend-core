import { Injectable } from '@nestjs/common';
import { MergePolicy, SoT } from './types';

const DEFAULT_POLICY: MergePolicy = {
  salon:     { name:'APP', description:'APP', photos:'APP', logo:'APP', address:'CRM', timezone:'CRM', workingSchedule:'CRM', phone:'CRM', email:'CRM', location:'CRM' },
  categories:{ name:'APP', parent:'APP' },
  services:  { name:'APP', price:'APP', currency:'APP', durationMin:'APP', category:'APP', active:'APP', description:'APP' },
  workers:   { name:'APP', avatar:'APP', phone:'CRM', email:'CRM', active:'CRM', position:'CRM', description:'APP', photoUrl:'APP', schedule:'CRM' },
};

@Injectable()
export class MergePolicyService {
  async getPolicy(_salonId: string): Promise<MergePolicy> { return DEFAULT_POLICY; }
  decide(owner: SoT, localTs?: string, remoteTs?: string): 'APP' | 'CRM' {
    if (owner === 'APP' || owner === 'CRM') return owner;
    const lt = localTs ? Date.parse(localTs) : 0;
    const rt = remoteTs ? Date.parse(remoteTs) : 0;
    return lt >= rt ? 'APP' : 'CRM';
  }
}

