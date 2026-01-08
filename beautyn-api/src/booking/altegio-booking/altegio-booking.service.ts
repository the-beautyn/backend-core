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
  ) {}

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
    const start = new Date(dto.datetime);
    const endDatetime = slotLengthSec ? new Date(start.getTime() + slotLengthSec * 1000) : null;

    const created = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          salonId,
          userId,
          workerId: worker.id,
          datetime: start,
          endDatetime,
          status: 'created',
          comment: dto.comment ?? 'Beautyn',
          crmRecordId: recordData?.id ? String(recordData.id) : null,
          crmCompanyId: ctx.externalSalonId ?? null,
          crmStaffId: String(crmStaffId),
          crmServiceIds: crmServiceIds,
          serviceIds: dto.serviceIds,
          shortLink: recordData?.short_link ?? null,
          crmType: CrmType.ALTEGIO,
          crmPayload: recordData ?? payload,
        },
      });

      const details = this.mapAltegioDetails(recordData, booking.id);
      await tx.altegioBookingDetails.upsert({
        where: { bookingId: booking.id },
        update: details,
        create: { bookingId: booking.id, ...details },
      });

      await tx.altegioBookingStaff.upsert({
        where: { detailsId: booking.id },
        update: this.mapAltegioStaff(staffData),
        create: { detailsId: booking.id, ...this.mapAltegioStaff(staffData) },
      });

      await tx.altegioBookingClient.upsert({
        where: { detailsId: booking.id },
        update: this.mapAltegioClient(clientData),
        create: { detailsId: booking.id, ...this.mapAltegioClient(clientData) },
      });

      await tx.altegioBookingService.deleteMany({ where: { detailsId: booking.id } });
      const serviceRows = this.mapAltegioServices(recordData?.services, booking.id);
      if (serviceRows.length) {
        await tx.altegioBookingService.createMany({ data: serviceRows });
      }

      await tx.altegioBookingDocument.deleteMany({ where: { detailsId: booking.id } });
      const docs = this.mapAltegioDocuments(recordData?.documents, booking.id);
      if (docs.length) {
        await tx.altegioBookingDocument.createMany({ data: docs });
      }

      await tx.altegioBookingGoodsTransaction.deleteMany({ where: { detailsId: booking.id } });
      const goods = this.mapAltegioGoods(recordData?.goods_transactions, booking.id);
      if (goods.length) {
        await tx.altegioBookingGoodsTransaction.createMany({ data: goods });
      }

      return booking;
    });

    return {
      bookingId: created.id,
      crmRecordId: Number(recordData?.id ?? 0),
      shortLink: recordData?.short_link ?? null,
      status: 'created',
    };
  }

  private mapAltegioDetails(data: any, bookingId: string) {
    if (!data || typeof data !== 'object') return { rawPayload: data ?? null };
    return {
      crmRecordId: data.id ? String(data.id) : null,
      companyId: data.company_id ? String(data.company_id) : null,
      staffId: data.staff_id ? String(data.staff_id) : null,
      clientId: data.client?.id ? String(data.client.id) : null,
      datetime: this.toDate(data.datetime),
      date: this.toDate(data.date),
      createDate: this.toDate(data.create_date),
      comment: data.comment ?? null,
      online: data.online ?? null,
      attendance: this.toNumber(data.attendance),
      visitAttendance: this.toNumber(data.visit_attendance),
      confirmed: this.toNumber(data.confirmed),
      seanceLength: this.toNumber(data.seance_length),
      length: this.toNumber(data.length),
      technicalBreak: this.toNumber(data.technical_break_duration),
      smsBefore: this.toNumber(data.sms_before),
      smsNow: this.toNumber(data.sms_now),
      emailNow: this.toNumber(data.email_now),
      notified: this.toNumber(data.notified),
      masterRequest: this.toNumber(data.master_request),
      apiId: data.api_id ?? null,
      fromUrl: data.from_url ?? null,
      reviewRequested: this.toNumber(data.review_requested),
      visitId: data.visit_id ? String(data.visit_id) : null,
      createdUserId: data.created_user_id ? String(data.created_user_id) : null,
      deleted: data.deleted ?? null,
      paidFull: this.toNumber(data.paid_full),
      prepaid: data.prepaid ?? null,
      prepaidConfirmed: data.prepaid_confirmed ?? null,
      isUpdateBlocked: data.is_update_blocked ?? null,
      lastChangeDate: this.toDate(data.last_change_date),
      customColor: data.custom_color ?? null,
      customFontColor: data.custom_font_color ?? null,
      smsRemainHours: this.toNumber(data.sms_remain_hours),
      emailRemainHours: this.toNumber(data.email_remain_hours),
      bookformId: this.toNumber(data.bookform_id),
      recordFrom: data.record_from ?? null,
      isMobile: this.toNumber(data.is_mobile),
      shortLink: data.short_link ?? null,
      rawPayload: data ?? null,
    };
  }

  private mapAltegioStaff(staff: any) {
    if (!staff || typeof staff !== 'object') {
      return { externalId: null, apiId: null, name: null, specialization: null, position: null, avatar: null, avatarBig: null, rating: null, votesCount: null };
    }
    return {
      externalId: staff.id ? String(staff.id) : null,
      apiId: staff.api_id ? String(staff.api_id) : null,
      name: staff.name ?? null,
      specialization: staff.specialization ?? null,
      position: staff.position ?? null,
      avatar: staff.avatar ?? null,
      avatarBig: staff.avatar_big ?? null,
      rating: staff.rating ?? null,
      votesCount: this.toNumber(staff.votes_count),
    };
  }

  private mapAltegioClient(client: any) {
    if (!client || typeof client !== 'object') {
      return { externalId: null, name: null, surname: null, patronymic: null, displayName: null, comment: null, phone: null, card: null, email: null, successVisits: null, failVisits: null, discount: null, sex: null, birthday: null, clientTags: null, customFields: null };
    }
    return {
      externalId: client.id ? String(client.id) : null,
      name: client.name ?? null,
      surname: client.surname ?? null,
      patronymic: client.patronymic ?? null,
      displayName: client.display_name ?? null,
      comment: client.comment ?? null,
      phone: client.phone ?? null,
      card: client.card ?? null,
      email: client.email ?? null,
      successVisits: this.toNumber(client.success_visits_count),
      failVisits: this.toNumber(client.fail_visits_count),
      discount: this.toNumber(client.discount),
      sex: this.toNumber(client.sex),
      birthday: client.birthday ?? null,
      clientTags: client.client_tags ?? null,
      customFields: client.custom_fields ?? null,
    };
  }

  private mapAltegioServices(services: any, detailsId: string) {
    if (!Array.isArray(services)) return [];
    return services
      .map((s: any) => ({
        detailsId,
        externalId: s?.id ? String(s.id) : null,
        title: s?.title ?? null,
        cost: this.toNumber(s?.cost),
        costToPay: this.toNumber(s?.cost_to_pay),
        manualCost: this.toNumber(s?.manual_cost),
        costPerUnit: this.toNumber(s?.cost_per_unit),
        discount: this.toNumber(s?.discount),
        firstCost: this.toNumber(s?.first_cost),
        amount: this.toNumber(s?.amount),
      }));
  }

  private mapAltegioDocuments(docs: any, detailsId: string) {
    if (!Array.isArray(docs)) return [];
    return docs.map((d: any) => ({
      detailsId,
      externalId: d?.id ? String(d.id) : null,
      typeId: this.toNumber(d?.type_id),
      storageId: this.toNumber(d?.storage_id),
      userId: this.toNumber(d?.user_id),
      companyId: this.toNumber(d?.company_id),
      number: this.toNumber(d?.number),
      comment: d?.comment ?? null,
      dateCreated: this.toDate(d?.date_created),
      categoryId: this.toNumber(d?.category_id),
      visitId: d?.visit_id ? String(d.visit_id) : null,
      recordId: d?.record_id ? String(d.record_id) : null,
      typeTitle: d?.type_title ?? null,
      isSaleBillPrinted: d?.is_sale_bill_printed ?? null,
    }));
  }

  private mapAltegioGoods(goods: any, detailsId: string) {
    if (!Array.isArray(goods)) return [];
    return goods.map((g: any) => ({
      detailsId,
      externalId: g?.id ? String(g.id) : null,
      typeId: this.toNumber(g?.type_id),
      storageId: this.toNumber(g?.storage_id),
      userId: this.toNumber(g?.user_id),
      companyId: this.toNumber(g?.company_id),
      number: this.toNumber(g?.number),
      comment: g?.comment ?? null,
      dateCreated: this.toDate(g?.date_created),
      categoryId: this.toNumber(g?.category_id),
      visitId: g?.visit_id ? String(g.visit_id) : null,
      recordId: g?.record_id ? String(g.record_id) : null,
      typeTitle: g?.type_title ?? null,
      isSaleBillPrinted: g?.is_sale_bill_printed ?? null,
    }));
  }

  private toNumber(value: any): number | null {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  private toDate(value: any): Date | null {
    if (!value || (typeof value !== 'string' && typeof value !== 'number')) return null;
    const ts = Date.parse(String(value));
    return Number.isFinite(ts) ? new Date(ts) : null;
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
