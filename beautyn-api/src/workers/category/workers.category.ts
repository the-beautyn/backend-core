import { Injectable, NotFoundException } from '@nestjs/common';
import { Worker } from '@prisma/client';
import { WorkersRepository, WorkerEntityInput } from '../repositories/workers.repository';
import { WorkerMapper } from '../mappers/worker.mapper';
import { WorkerDto } from '../dto/worker.dto';

@Injectable()
export class WorkersCategory {
  constructor(private readonly repo: WorkersRepository) {}

  async pull(salonId: string): Promise<WorkerDto[]> {
    const rows = await this.repo.listBySalon(salonId);
    return rows.map((w) => WorkerMapper.toDto(w));
  }

  async rebase(salonId: string, payloads: Array<WorkerEntityInput & { id?: string }>): Promise<{ workers: WorkerDto[]; upserted: number; deleted: number }> {
    const { upserted, deleted, current } = await this.repo.bulkRebase(salonId, payloads);
    return {
      upserted,
      deleted,
      workers: current.map((w) => WorkerMapper.toDto(w)),
    };
  }

  async upsertFromCrm(salonId: string, payload: WorkerEntityInput & { id?: string }): Promise<WorkerDto> {
    const saved = await this.repo.upsertFromCrm(salonId, payload);
    return WorkerMapper.toDto(saved);
  }

  async create(salonId: string, payload: WorkerEntityInput): Promise<WorkerDto> {
    const created = await this.repo.create(salonId, payload);
    return WorkerMapper.toDto(created);
  }

  async update(workerId: string, salonId: string, payload: WorkerEntityInput): Promise<WorkerDto> {
    const updated = await this.repo.update(workerId, salonId, payload);
    return WorkerMapper.toDto(updated);
  }

  async delete(workerId: string): Promise<void> {
    await this.repo.delete(workerId);
  }

  async requireWithinSalon(workerId: string, salonId: string): Promise<Worker> {
    const found = await this.repo.findByIdWithinSalon(workerId, salonId);
    if (!found) {
      throw new NotFoundException('Worker not found');
    }
    return found;
  }
}
