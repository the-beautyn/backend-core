import { Worker, WorkerService } from '@prisma/client';
import { WorkerDto } from '../dto/worker.dto';

export class WorkerMapper {
  static toDto(worker: Worker & { services?: WorkerService[] }): WorkerDto {
    const dto: WorkerDto = {
      id: worker.id,
      salon_id: worker.salonId,
      first_name: worker.firstName,
      last_name: worker.lastName,
      role: worker.role ?? null,
      email: worker.email ?? null,
      phone: worker.phone ?? null,
      photo_url: worker.photoUrl ?? null,
      is_active: worker.isActive,
    };
    if (worker.services) {
      dto.service_ids = worker.services.map((s) => s.serviceId);
    }
    return dto;
  }
}
