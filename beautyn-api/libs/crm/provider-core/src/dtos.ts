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
  location?: { country?: string; city?: string; addressLine?: string; lat?: number; lon?: number };
  phone?: string;
  email?: string;
  timezone?: string;
  workingSchedule?: string;
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

// --- Helpers ---
/** Map Day (0=Sun..Sat) to English name */
const DAY_NAME: Record<Day, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

/** Normalize input time ("HH:MM" or "HH.MM") to "HH.MM" */
function toDotHhmm(input: Hhmm): string {
  const s = String(input).trim();
  const norm = s.replace(':', '.');
  const [hh, mm = '00'] = norm.split('.');
  const H = (hh ?? '').padStart(2, '0').slice(-2);
  const M = (mm ?? '').padStart(2, '0').slice(-2);
  return `${H}.${M}`;
}

/** Format a single WorkingDay into "Monday: 09.00-12.00 13.00-18.00" */
export function formatWorkingDay(day: WorkingDay): string {
  const name = DAY_NAME[day.day];
  const start = toDotHhmm(day.opensAt);
  const end = toDotHhmm(day.closesAt);
  const breaks = Array.isArray(day.breaks) ? day.breaks : [];
  let cursor = start;
  const segments: string[] = [];
  for (const b of breaks) {
    const bStart = toDotHhmm((b as any).startAt);
    const bEnd = toDotHhmm((b as any).endAt);
    if (cursor < bStart) segments.push(`${cursor}-${bStart}`);
    cursor = bEnd;
  }
  if (cursor < end) segments.push(`${cursor}-${end}`);
  const hours = segments.length ? segments.join(' ') : `${start}-${end}`;
  return `${name}: ${hours}`;
}

/** Join multiple WorkingDay lines separated by newlines. */
export function formatWorkingSchedule(days: WorkingDay[]): string {
  const order: Day[] = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun
  const rank = new Map<Day, number>(order.map((d, i) => [d, i] as [Day, number]));
  const sorted = (days || []).slice().sort((a, b) => (rank.get(a.day) ?? 99) - (rank.get(b.day) ?? 99));
  return sorted.map(formatWorkingDay).join('\n');
}

