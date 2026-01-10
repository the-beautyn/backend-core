import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { AltegioBookTimesResponse } from '@crm/provider-core';
import type { AltegioBooking } from '@crm/provider-core/altegio/bookings';
import { CrmType, CrmError, ErrorKind } from '@crm/shared';
import { CrmIntegrationService } from '../../crm-integration/core/crm-integration.service';
import { GetBookableServicesDto } from './dto/get-services.dto';
import { GetBookableWorkersDto } from './dto/get-workers.dto';
import { GetBookableDatesDto } from './dto/get-dates.dto';
import { GetTimeSlotsDto } from './dto/get-timeslots.dto';
import { CreateAltegioRecordDto } from './dto/create-record.dto';
import { mapBookableDates, mapBookableServices, mapBookableWorkers, mapTimeSlots } from './mappers/altegio-booking.mapper';
import { BookableServicesResponseDto } from './dto/bookable-services.response.dto';
import { BookableWorkersResponseDto } from './dto/bookable-workers.response.dto';
import { BookableDatesResponseDto } from './dto/bookable-dates.response.dto';
import { TimeSlotsResponseDto } from './dto/time-slots.response.dto';
import { CreateAltegioRecordResponseDto } from './dto/create-record.response.dto';
import { UserService } from '../../user/user.service';
import { createChildLogger } from '@shared/logger';
import { BookingHandlerService } from '../booking-handler.service';

type SalonContext = {
  salonId: string;
  externalSalonId?: string | null;
  provider: CrmType;
};

@Injectable()
export class AltegioBookingService {
  private readonly log = createChildLogger(AltegioBookingService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly crmIntegration: CrmIntegrationService,
    private readonly users: UserService,
    private readonly bookingHandler: BookingHandlerService,
  ) {}

  async handleBookings(params: { bookings: AltegioBooking[] }) {
    const results = await Promise.all(
      params.bookings.map((booking) =>
        this.bookingHandler.handleAltegioBooking({ booking }),
      ),
    );
    return {
      bookings: results.map(result => result.booking)
    }
  }

  async handleBooking(params: { booking: AltegioBooking }) {
    return this.bookingHandler.handleAltegioBooking({ booking: params.booking });
  }

  async getBookableServices(salonId: string, query: GetBookableServicesDto): Promise<BookableServicesResponseDto> {
    const ctx = await this.requireAltegioSalon(salonId);
    const [services, selectedServices, staffId] = await Promise.all([
      this.prisma.service.findMany({
        where: { salonId, isActive: true },
        include: { category: { select: { id: true, name: true } } },
      }),
      this.resolveServicesByIds(salonId, query.selectedServiceIds ?? []),
      this.resolveWorkerExternalId(salonId, query.workerId),
    ]);

    const serviceIdsForFilter = selectedServices.map((s) => this.requireCrmId(s.crmServiceId, 'service'));
    const allowed = await this.callCrm(() =>
      this.crmIntegration.bookServices(ctx.salonId, ctx.provider, {
        serviceIds: serviceIdsForFilter,
        staffId: staffId ?? undefined,
      }),
    );
    const allowedIds = new Set<string>((allowed.services ?? []).map((s) => String(s.id)));

    return mapBookableServices(
      services.map((s) => ({
        id: s.id,
        name: s.name,
        price: s.price,
        duration: s.duration,
        categoryId: s.categoryId,
        crmServiceId: s.crmServiceId,
        category: s.category as any,
      })),
      allowedIds,
    );
  }

  async getBookableWorkers(salonId: string, query: GetBookableWorkersDto): Promise<BookableWorkersResponseDto> {
    const ctx = await this.requireAltegioSalon(salonId);
    const [workers, services] = await Promise.all([
      this.prisma.worker.findMany({ where: { salonId, isActive: true } }),
      this.resolveServicesByIds(salonId, query.serviceIds ?? []),
    ]);

    const externalServiceIds = services.map((s) => this.requireCrmId(s.crmServiceId, 'service'));
    const staff = await this.callCrm(() =>
      this.crmIntegration.bookStaff(ctx.salonId, ctx.provider, {
        serviceIds: externalServiceIds,
        datetime: query.datetime,
      }),
    );
    const staffList: Array<{ id: number; bookable?: boolean }> = Array.isArray(staff) ? (staff as any) : ((staff as any)?.staff ?? []);
    const bookableIds = new Set<string>(
      staffList
        .filter((s) => s.bookable === true)
        .map((s) => String(s.id)),
    );
    const baseWorkers = mapBookableWorkers(
      workers.map((w) => ({
        id: w.id,
        firstName: w.firstName,
        lastName: w.lastName,
        position: w.position,
        photoUrl: w.photoUrl,
        crmWorkerId: w.crmWorkerId,
      })),
      bookableIds,
    ).workers;

    const includeSlots = !!query.includeSlots;
    const target = query.datetime ? new Date(query.datetime) : new Date();
    const dateStr = this.formatDate(target);
    const workerExternalMap = new Map<string, number>();
    workers.forEach((w) => {
      if (w.crmWorkerId) {
        const parsed = Number(w.crmWorkerId);
        if (Number.isFinite(parsed)) workerExternalMap.set(w.id, parsed);
      }
    });

    let slotMap = new Map<string, TimeSlotsResponseDto['slots'] | null>();
    if (includeSlots) {
      const slotPromises = baseWorkers.map(async (w) => {
        const externalId = workerExternalMap.get(w.id);
        if (!externalId || !bookableIds.has(String(externalId))) {
          slotMap.set(w.id, null);
          return;
        }
        const times = await this.callCrm(() =>
          this.crmIntegration.bookTimes(ctx.salonId, ctx.provider, { staffId: externalId, date: dateStr, serviceIds: externalServiceIds }),
        );
        const timeList = Array.isArray((times as any)?.times) ? (times as any).times : Array.isArray(times) ? (times as any) : [];
        const targetMs = target.getTime();
        const filteredByTime = timeList.filter((t: any) => {
          const ts = new Date(t?.datetime ?? '').getTime();
          return Number.isFinite(ts) ? ts >= targetMs : true;
        });
        const pool = filteredByTime.length ? filteredByTime : timeList;
        const nearestSlots = pool.slice(0, 6);
        slotMap.set(w.id, mapTimeSlots(nearestSlots).slots);
      });
      await Promise.all(slotPromises);
    }

    const enrichedWorkers = baseWorkers.map((w) => ({ ...w, slots: slotMap.size ? slotMap.get(w.id) ?? null : undefined }));
    return { workers: enrichedWorkers };
  }

  async getBookableDates(salonId: string, query: GetBookableDatesDto): Promise<BookableDatesResponseDto> {
    const ctx = await this.requireAltegioSalon(salonId);
    const [services, staffId] = await Promise.all([
      this.resolveServicesByIds(salonId, query.serviceIds ?? []),
      this.resolveWorkerExternalId(salonId, query.workerId),
    ]);

    const serviceIds = services.map((s) => this.requireCrmId(s.crmServiceId, 'service'));
    const dateFrom = query.dateFrom ?? this.formatDate(new Date());
    const dateTo = query.dateTo ?? this.formatDate(this.addDays(new Date(), 30));

    const dates = await this.callCrm(() =>
      this.crmIntegration.bookDates(ctx.salonId, ctx.provider, {
        serviceIds,
        staffId: staffId ?? undefined,
        dateFrom,
        dateTo,
      }),
    );
    return mapBookableDates(dates.booking_dates ?? []);
  }

  async getTimeSlots(salonId: string, query: GetTimeSlotsDto): Promise<TimeSlotsResponseDto> {
    const ctx = await this.requireAltegioSalon(salonId);
    const [services, staffId] = await Promise.all([
      this.resolveServicesByIds(salonId, query.serviceIds ?? []),
      this.resolveWorkerExternalId(salonId, query.workerId),
    ]);
    const serviceIds = services.map((s) => this.requireCrmId(s.crmServiceId, 'service'));
    const staff = staffId ?? 0;
    const times = await this.callCrm(() =>
      this.crmIntegration.bookTimes(ctx.salonId, ctx.provider, { staffId: staff, date: query.date, serviceIds }),
    );
    const timeList = Array.isArray((times as any)?.times) ? (times as any).times : Array.isArray(times) ? (times as any) : [];
    return mapTimeSlots(timeList);
  }

  async createRecord(
    salonId: string,
    userId: string,
    dto: CreateAltegioRecordDto,
  ): Promise<CreateAltegioRecordResponseDto> {
    const ctx = await this.requireAltegioSalon(salonId);
    const [services, worker, user] = await Promise.all([
      this.resolveServicesByIds(salonId, dto.serviceIds ?? []),
      this.resolveWorkerById(salonId, dto.workerId),
      this.users.findContactInfo(userId),
    ]);
    const crmStaffId = this.requireCrmId(worker.crmWorkerId, 'worker');
    const crmServiceIds = services.map((s) => this.requireCrmId(s.crmServiceId, 'service'));

    const datePart = dto.datetime.slice(0, 10);
    const slotLengthSec = await this.pickSlotLength(ctx, crmStaffId, datePart, crmServiceIds, dto.datetime);

    this.log.info('client info', { phone: user.phone ?? undefined, name: [user.name, user.second_name].filter(Boolean).join(' ').trim() || undefined, email: user.email ?? undefined });
    const payload = {
      staff_id: crmStaffId,
      services: crmServiceIds.map((id) => ({ id })),
      client: { phone: user.phone ?? undefined, name: [user.name, user.second_name].filter(Boolean).join(' ').trim() || undefined, email: user.email ?? undefined },
      datetime: dto.datetime,
      seance_length: slotLengthSec,
      comment: dto.comment,
      save_if_busy: false,
      attendance: dto.attendance ?? 1,
    };

    const record = await this.callCrm(() => this.crmIntegration.createRecord(ctx.salonId, ctx.provider, payload));
    const recordData: any = (record as any)?.data ?? record ?? {};
    const clientData = recordData?.client ?? (record as any)?.client ?? payload?.client ?? null;
    const staffData = recordData?.staff ?? (record as any)?.staff ?? null;

    const bookingPayload: AltegioBooking = {
      crmRecordId: recordData?.id ? String(recordData.id) : null,
      companyId: recordData?.company_id ? String(recordData.company_id) : ctx.externalSalonId ? String(ctx.externalSalonId) : null,
      staffId: recordData?.staff_id ? String(recordData.staff_id) : String(crmStaffId),
      clientId: recordData?.client?.id ? String(recordData.client.id) : null,
      datetime: recordData?.datetime ?? dto.datetime,
      date: recordData?.date ?? null,
      comment: recordData?.comment ?? dto.comment ?? null,
      attendance: recordData?.attendance ?? null,
      confirmed: recordData?.confirmed ?? null,
      visitAttendance: recordData?.visit_attendance ?? null,
      length: recordData?.length ?? null,
      seanceLength: recordData?.seance_length ?? slotLengthSec ?? null,
      isDeleted: recordData?.deleted ?? recordData?.is_deleted ?? null,
      staff: recordData?.staff ?? staffData ?? null,
      client: recordData?.client ?? clientData ?? null,
      services: recordData?.services ?? payload?.services ?? null,
      documents: recordData?.documents ?? null,
      goodsTransactions: recordData?.goods_transactions ?? null,
      raw: recordData ?? payload,
    };
    const created = await this.bookingHandler.createAltegioBooking({ salonId, booking: bookingPayload, userId });

    return {
      bookingId: created.booking.id,
      crmRecordId: Number(recordData?.id ?? 0),
      shortLink: recordData?.short_link ?? null,
      status: 'created',
    };
  }

  private async requireAltegioSalon(salonId: string): Promise<SalonContext> {
    const salon = await this.prisma.salon.findFirst({
      where: { id: salonId, deletedAt: null },
      select: { id: true, provider: true, externalSalonId: true },
    });
    if (!salon) throw new NotFoundException('Salon not found');
    if (salon.provider !== CrmType.ALTEGIO) {
      throw new BadRequestException('Salon is not linked to Altegio');
    }
    return {
      salonId,
      externalSalonId: salon.externalSalonId ?? undefined,
      provider: CrmType.ALTEGIO,
    };
  }

  private async resolveServicesByIds(salonId: string, serviceIds: string[]): Promise<Array<{ id: string; crmServiceId: string | null; name: string }>> {
    if (!serviceIds.length) return [];
    const services = await this.prisma.service.findMany({ where: { salonId, id: { in: serviceIds } } });
    if (services.length !== serviceIds.length) {
      throw new NotFoundException('One or more services were not found');
    }
    services.forEach((s) => {
      if (!s.crmServiceId) throw new ConflictException('Service is not connected to Altegio');
    });
    return services;
  }

  private async resolveWorkerById(salonId: string, workerId: string) {
    const worker = await this.prisma.worker.findFirst({ where: { id: workerId, salonId } });
    if (!worker) throw new NotFoundException('Worker not found');
    if (!worker.crmWorkerId) throw new ConflictException('Worker is not connected to Altegio');
    return worker;
  }

  private async resolveWorkerExternalId(salonId: string, workerId?: string) {
    if (!workerId) return null;
    const worker = await this.prisma.worker.findFirst({ where: { id: workerId, salonId } });
    if (!worker) throw new NotFoundException('Worker not found');
    if (!worker.crmWorkerId) throw new ConflictException('Worker is not connected to Altegio');
    const parsed = Number(worker.crmWorkerId);
    if (!Number.isFinite(parsed)) throw new UnprocessableEntityException('Worker external id is invalid');
    return parsed;
  }

  private requireCrmId(id: string | null, kind: 'service' | 'worker'): number {
    if (!id) {
      throw new ConflictException(`${kind} is not connected to Altegio`);
    }
    const parsed = Number(id);
    if (!Number.isFinite(parsed)) {
      throw new UnprocessableEntityException(`Invalid ${kind} CRM id`);
    }
    return parsed;
  }

  private formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private addDays(d: Date, days: number): Date {
    const copy = new Date(d.getTime());
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  private async pickSlotLength(ctx: SalonContext, staffId: number, date: string, serviceIds: number[], targetDatetime: string): Promise<number | null> {
    const res = await this.callCrm<AltegioBookTimesResponse>(() =>
      this.crmIntegration.bookTimes(ctx.salonId, ctx.provider, { staffId, date, serviceIds }),
    );
    const timeList = Array.isArray((res as any)?.times) ? (res as any).times : Array.isArray(res) ? (res as any) : [];
    const slot = timeList.find((t: any) => t?.datetime === targetDatetime);
    return slot?.sum_length ?? slot?.seance_length ?? null;
  }

  private async callCrm<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      this.rethrowCrmError(e);
      throw e;
    }
  }

  private rethrowCrmError(e: unknown): never {
    if (e instanceof CrmError) {
      const vendorMessage =
        e.vendorMessage ||
        (typeof (e as any)?.cause === 'object' && (e as any).cause && (e as any).cause.body?.meta?.message) ||
        (typeof (e as any)?.cause === 'object' && (e as any).cause && (e as any).cause.body?.message);
      const message = vendorMessage || e.message;
      switch (e.kind) {
        case ErrorKind.AUTH:
          throw new UnauthorizedException(message);
        case ErrorKind.RATE_LIMIT:
          throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
        case ErrorKind.NETWORK:
          throw new BadGatewayException(message);
        case ErrorKind.VALIDATION:
          throw new UnprocessableEntityException(message);
        default:
          throw new BadRequestException(message);
      }
    }
    throw e;
  }
}
