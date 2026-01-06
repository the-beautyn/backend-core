export type EasyweekBookingDtoNormalized = {
  bookingUuid: string;
  locationUuid?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  timezone?: string | null;
  isCanceled?: boolean;
  isCompleted?: boolean;
  statusName?: string | null;
  orderedServices?: any[];
  order?: any;
  duration?: any;
  policy?: any;
  links?: any;
  raw?: any;
};
