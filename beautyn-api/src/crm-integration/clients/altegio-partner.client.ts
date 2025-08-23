import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class AltegioPartnerClient {
  private readonly endpoint = 'https://app.alteg.io/marketplace/partner/callback';
  private readonly applicationId = process.env.ALTEGIO_APPLICATION_ID;

  async confirmRegistration(externalSalonId: string): Promise<void> {
    const appId = this.applicationId;
    if (!appId) {
      throw new BadRequestException('ALTEGIO_APPLICATION_ID is not configured');
    }

    const resp = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Accept: 'application/vnd.api.v2+json',
        Authorization: `Bearer ${appId}`,
      },
      body: JSON.stringify({ salon_id: externalSalonId, application_id: appId }),
    });

    if (resp.status !== 201) {
      const text = await resp.text().catch(() => '');
      throw new BadRequestException(`Altegio callback failed: ${resp.status} ${text}`);
    }
  }
}


