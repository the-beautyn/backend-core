import { Injectable, NotFoundException } from '@nestjs/common';
import { normalizePagination } from '../shared/utils/pagination.util';
import { SalonClientsRepository } from './salon-clients.repository';
import { SalonClientMapper } from './mappers/salon-client.mapper';
import { SalonClientDto } from './dto/salon-client.dto';
import { SalonClientsListResponseDto } from './dto/salon-clients-list.response.dto';
import { OwnerClientsListQueryDto } from './dto/owner-clients-list.query';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

@Injectable()
export class SalonClientsService {
  constructor(private readonly repository: SalonClientsRepository) {}

  async list(salonId: string, query: OwnerClientsListQueryDto): Promise<SalonClientsListResponseDto> {
    const { page, limit, skip } = normalizePagination(query.page, query.limit, {
      defaultLimit: DEFAULT_PAGE_SIZE,
      maxLimit: MAX_PAGE_SIZE,
    });
    const { items, total } = await this.repository.paginate(salonId, { skip, take: limit, q: query.q, sort: query.sort });
    return { items: items.map((row) => SalonClientMapper.toDto(row)), page, limit, total };
  }

  /** 404 for a missing row and for another salon's row alike — same as every other salon resource. */
  async get(salonId: string, clientId: string): Promise<SalonClientDto> {
    const row = await this.repository.findOne(salonId, clientId);
    if (!row) throw new NotFoundException('Client not found');
    return SalonClientMapper.toDto(row);
  }
}
