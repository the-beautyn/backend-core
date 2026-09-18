/**
 * The customer EasyWeek attaches to a booking. Mirrors `EasyWeekBookingCustomer`
 * from the provider lib; `phone` is already E.164.
 */
export type EasyweekBookingCustomerDto = {
  uuid?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
  phone?: string | null;
  email?: string | null;
};

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
  comment?: string | null;
  duration?: any;
  policy?: any;
  links?: any;
  customer?: EasyweekBookingCustomerDto | null;
  raw?: any;
};
