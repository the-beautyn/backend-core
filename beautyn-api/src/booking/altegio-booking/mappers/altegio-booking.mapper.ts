import { BookableDatesResponseDto } from '../dto/bookable-dates.response.dto';
import {
  BookableServiceCategoryDto,
  BookableServiceDto,
  BookableServicesResponseDto,
} from '../dto/bookable-services.response.dto';
import { BookableWorkerDto, BookableWorkersResponseDto } from '../dto/bookable-workers.response.dto';
import { TimeSlotDto, TimeSlotsResponseDto } from '../dto/time-slots.response.dto';

type ServiceRow = {
  id: string;
  categoryId: string | null;
  name: string;
  price: number;
  duration: number;
  crmServiceId: string | null;
  category?: { id: string; name: string | null } | null;
};

type WorkerRow = {
  id: string;
  firstName: string;
  lastName: string;
  position?: string | null;
  photoUrl?: string | null;
  crmWorkerId?: string | null;
};

export function mapBookableServices(
  services: ServiceRow[],
  allowedExternalServiceIds: Set<string>,
): BookableServicesResponseDto {
  const categories = new Map<string, BookableServiceCategoryDto>();
  const mappedServices: BookableServiceDto[] = services.map((s) => {
    if (s.categoryId && !categories.has(s.categoryId)) {
      categories.set(s.categoryId, { id: s.categoryId, name: s.category?.name ?? '' });
    }
    return {
      id: s.id,
      categoryId: s.categoryId ?? null,
      name: s.name,
      price: s.price,
      durationSec: s.duration ?? null,
      isAvailable: s.crmServiceId ? allowedExternalServiceIds.has(String(s.crmServiceId)) : false,
    };
  });

  return {
    categories: Array.from(categories.values()),
    services: mappedServices,
  };
}

export function mapBookableWorkers(workers: WorkerRow[], bookableExternalWorkerIds: Set<string>): BookableWorkersResponseDto {
  return {
    workers: workers.map((w) => ({
      id: w.id,
      name: [w.firstName, w.lastName].filter(Boolean).join(' ').trim(),
      specialization: w.position ?? null,
      avatar: w.photoUrl ?? null,
      rating: null,
      bookable: w.crmWorkerId ? bookableExternalWorkerIds.has(String(w.crmWorkerId)) : false,
    })),
  };
}

export function mapBookableDates(bookingDates: string[]): BookableDatesResponseDto {
  return { bookingDates };
}

export function mapTimeSlots(rawSlots: Array<{ time: string; datetime: string; seance_length?: number | null; sum_length?: number | null }>): TimeSlotsResponseDto {
  const slots: TimeSlotDto[] = rawSlots.map((slot) => ({
    time: slot.time,
    datetime: slot.datetime,
    seanceLengthSec: slot.seance_length ?? 0,
    sumLengthSec: slot.sum_length ?? 0,
  }));
  return { slots };
}
