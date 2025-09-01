export type Day = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sun..Sat
export type Hhmm = string; // "09:00"

export type WorkingInterval = { startAt: Hhmm; endAt: Hhmm };
export type WorkingDay = { day: Day; opensAt: Hhmm; closesAt: Hhmm; breaks?: WorkingInterval[] };

export type SalonData = {
  externalId: string;
  name: string;
  description?: string;
  mainImageUrl?: string;
  imageUrls?: string[];
  location?: { country: string; city: string; addressLine: string; lat?: number; lon?: number };
  phone?: string;
  email?: string;
  timezone?: string;
  workingSchedule?: WorkingDay[];
  updatedAtIso?: string;
};

export type CategoryData = {
  externalId: string;
  name: string;
  parentExternalId?: string | null;
  isActive?: boolean;
  updatedAtIso?: string;
};

export type ServiceData = {
  externalId: string;
  name: string;
  durationMin: number;
  priceMinor: number;
  currency: string;
  categoryExternalId: string;
  description?: string;
  isActive?: boolean;
  updatedAtIso?: string;
};

export type WorkerData = {
  externalId: string;
  name: string;
  position?: string;
  description?: string;
  photoUrl?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
  updatedAtIso?: string;
};

export type WorkerSchedule = WorkingDay[];

export type Page<T> = { items: T[]; nextCursor?: string; fetched: number; total?: number };

