export interface WorkersSyncDto {
  salonId: string;
  workers: Array<{
    crmWorkerId?: string | null;
    firstName: string;
    lastName: string;
    position?: string | null;
    description?: string | null;
    email?: string | null;
    phone?: string | null;
    photoUrl?: string | null;
    isActive?: boolean;
  }>;
}
