import { CrmSalonChangeProposal } from '@prisma/client';
import { CrmSalonChangeDto } from '../dto/crm-salon-change.dto';

export class CrmSalonChangeMapper {
  static toDto(change: CrmSalonChangeProposal): CrmSalonChangeDto {
    return {
      id: change.id,
      salon_id: change.salonId,
      provider: change.provider,
      field_path: change.fieldPath,
      old_value: change.oldValue ?? null,
      new_value: change.newValue ?? null,
      status: change.status,
      detected_at: change.detectedAt.toISOString(),
      decided_at: change.decidedAt ? change.decidedAt.toISOString() : null,
      decided_by: change.decidedBy ?? null,
    };
  }
}
