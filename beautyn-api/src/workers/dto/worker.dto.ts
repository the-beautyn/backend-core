export class WorkerDto {
  id: string;
  salon_id: string;
  first_name: string;
  last_name: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  photo_url?: string | null;
  is_active: boolean;
  service_ids?: string[];
}
