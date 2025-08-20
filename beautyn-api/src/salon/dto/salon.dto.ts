export class SalonDto {
  id!: string;
  crm_id?: string;
  name!: string;
  address_line?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  rating_avg?: number;
  rating_count?: number;
  open_hours_json?: unknown;
  images_count?: number;
  cover_image_url?: string;
}
