export interface WorkersSyncDto {
  salon_id: string;
  workers: Array<{
    first_name: string;
    last_name: string;
    role?: string | null;
    email?: string | null;
    phone?: string | null;
    photo_url?: string | null;
    is_active?: boolean;
    work_schedule?: Record<string, Array<{ from: string; to: string }>>;
    service_external_ids?: string[];
  }>;
}
