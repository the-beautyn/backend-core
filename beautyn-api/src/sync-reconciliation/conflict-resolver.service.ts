import { Injectable } from '@nestjs/common';
import { MergePolicyService } from './merge-policy.service';
import { normalizeName, clampDuration } from './normalizers';

type Decision = { push?: any; pull?: any; autoNote?: string } | { noop: true };

@Injectable()
export class ConflictResolverService {
  constructor(private readonly policy: MergePolicyService) {}

  /** MVP: decide patches for Service (extend for other entities as needed) */
  async serviceDecision(
    salonId: string,
    local: any,
    remote: any,
    meta?: { localUpdatedAt?: string; remoteUpdatedAt?: string }
  ): Promise<Decision> {
    const p = await this.policy.getPolicy(salonId);
    const decide = (owner: 'APP'|'CRM'|'AUTO') => this.policy.decide(owner, meta?.localUpdatedAt, meta?.remoteUpdatedAt);

    const push: any = {};
    const pull: any = {};

    // name
    if (decide(p.services.name) === 'APP' && local.name !== remote.name) push.name = normalizeName(local.name);
    if (decide(p.services.name) === 'CRM' && local.name !== remote.name) pull.name = normalizeName(remote.name);

    // price/currency are APP in MVP
    if (decide(p.services.price) === 'APP' && local.priceMinor !== remote.priceMinor) push.priceMinor = local.priceMinor;
    if (decide(p.services.currency) === 'APP' && local.currency !== remote.currency) push.currency = local.currency;

    // duration
    const ld = clampDuration(local.durationMin ?? undefined);
    const rd = clampDuration(remote.durationMin ?? undefined);
    if (decide(p.services.durationMin) === 'APP' && ld !== rd) push.durationMin = ld;
    if (decide(p.services.durationMin) === 'CRM' && ld !== rd) pull.durationMin = rd;

    // category
    if (decide(p.services.category) === 'APP' && local.categoryExternalId !== remote.categoryExternalId) push.categoryExternalId = local.categoryExternalId;
    if (decide(p.services.category) === 'CRM' && local.categoryExternalId !== remote.categoryExternalId) pull.categoryExternalId = remote.categoryExternalId;

    // active
    if (decide(p.services.active) === 'APP' && !!local.isActive !== !!remote.isActive) push.isActive = !!local.isActive;
    if (decide(p.services.active) === 'CRM' && !!local.isActive !== !!remote.isActive) pull.isActive = !!remote.isActive;

    if (Object.keys(push).length) return { push };
    if (Object.keys(pull).length) return { pull };
    return { noop: true };
  }
}

