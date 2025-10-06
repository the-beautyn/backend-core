import { SalonData } from '../dtos';
import { AltegioContext } from './context';

export async function pullSalon(ctx: AltegioContext): Promise<SalonData> {
  const externalSalonId = ctx.requireExternalSalonId();
  const c = await ctx.http<any>('GET', `/api/v1/company/${externalSalonId}`);
  const gallery: string[] = c?.company_photos || [];
  const mainImage = c?.logo || gallery[0];
  return {
    externalId: String(c.id),
    name: c.public_title || c.title || 'Salon',
    description: ctx.stripHtml(c.description),
    mainImageUrl: mainImage,
    imageUrls: gallery,
    location: {
      country: c.country ?? '',
      city: c.city ?? '',
      addressLine: c.address ?? '',
      lat: c.coordinate_lat ?? undefined,
      lon: c.coordinate_lon ?? undefined,
    },
    workingSchedule: c.schedule ?? undefined,
    timezone: c.timezone_name ?? undefined,
  };
}


