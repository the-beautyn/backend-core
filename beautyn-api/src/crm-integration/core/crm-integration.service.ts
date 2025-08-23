import { Injectable } from '@nestjs/common';

@Injectable()
export class CrmIntegrationService {
  async linkAltegio({ userId, externalSalonId }: { userId: string; externalSalonId: string }): Promise<void> {
    // TODO: Implement actual logic to link the salon to Altegio CRM.
    // For example, update the local database to store the externalSalonId for the given salonId.
    // You might also want to call Altegio's API to verify the externalSalonId.
    console.log(`Linking user ${userId} to Altegio externalSalonId ${externalSalonId}`);
    // Example: await this.salonRepository.update({ id: salonId }, { altegioExternalId: externalSalonId });
    return;
  }

  async linkEasyWeek({ userId, authToken, workspaceSlug, externalSalonId }: { userId: string; authToken: string; workspaceSlug: string; externalSalonId: string }): Promise<void> {
    // TODO: Implement actual logic to link the salon to Altegio CRM.
    // For example, update the local database to store the externalSalonId for the given salonId.
    // You might also want to call Altegio's API to verify the externalSalonId.
    console.log(`Linking user ${userId} to EasyWeek externalSalonId ${externalSalonId}`);
    // Example: await this.salonRepository.update({ id: salonId }, { altegioExternalId: externalSalonId });
    return;
  }

  async enqueueInitialSync(salonId: string): Promise<void> {
    return;
  }
}
