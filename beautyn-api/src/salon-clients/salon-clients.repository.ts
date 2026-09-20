import { Injectable } from '@nestjs/common';
import { Prisma, SalonClient } from '@prisma/client';
import { PrismaService } from '../shared/database/prisma.service';
import { SalonClientSort } from './dto/owner-clients-list.query';

@Injectable()
export class SalonClientsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async paginate(
    salonId: string,
    params: { skip: number; take: number; q?: string | null; sort?: SalonClientSort | null },
  ): Promise<{ items: SalonClient[]; total: number }> {
    const where: Prisma.SalonClientWhereInput = { salonId };
    const search = SalonClientsRepository.searchClause(params.q);
    if (search) where.OR = search;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.salonClient.findMany({
        where,
        orderBy: SalonClientsRepository.orderBy(params.sort ?? SalonClientSort.NAME_ASC),
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.salonClient.count({ where }),
    ]);
    return { items, total };
  }

  findOne(salonId: string, clientId: string): Promise<SalonClient | null> {
    return this.prisma.salonClient.findFirst({ where: { id: clientId, salonId } });
  }

  /**
   * Name and email match case-insensitively. Phones are stored E.164 without
   * formatting, so the digits of the query are matched as a substring — with a
   * leading national 0 dropped, so "095 000", "0950000012" and "+380 95" all find
   * +380950000012.
   */
  static searchClause(q: string | null | undefined): Prisma.SalonClientWhereInput[] | null {
    const query = q?.trim();
    if (!query) return null;
    const clauses: Prisma.SalonClientWhereInput[] = [
      { displayName: { contains: query, mode: 'insensitive' } },
      { email: { contains: query, mode: 'insensitive' } },
    ];
    // Three digits typed is enough to start matching; "095" is a national prefix,
    // so the minimum is checked before the leading 0 is dropped.
    const digits = query.replace(/\D/g, '');
    if (digits.length >= 3) clauses.push({ phone: { contains: digits.replace(/^0/, '') } });
    return clauses;
  }

  static orderBy(sort: SalonClientSort): Prisma.SalonClientOrderByWithRelationInput[] {
    switch (sort) {
      case SalonClientSort.NAME_DESC:
        return [{ displayName: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }];
      case SalonClientSort.LAST_VISIT_DESC:
        return [{ lastVisitAt: { sort: 'desc', nulls: 'last' } }, { displayName: 'asc' }, { id: 'asc' }];
      case SalonClientSort.BOOKINGS_DESC:
        return [{ bookingsCount: 'desc' }, { displayName: 'asc' }, { id: 'asc' }];
      case SalonClientSort.NAME_ASC:
      default:
        return [{ displayName: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }];
    }
  }
}
