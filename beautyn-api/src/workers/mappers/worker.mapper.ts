import { Worker, WorkerService } from '@prisma/client';
import { WorkerDto } from '../dto/worker.dto';
import { PublicWorkerDto } from '../dto/worker-public.dto';

export class WorkerMapper {
  static toDto(worker: Worker & { services?: WorkerService[] }): WorkerDto {
    return {
      id: worker.id,
      crm_worker_id: worker.crmWorkerId ?? null,
      salon_id: worker.salonId,
      first_name: worker.firstName,
      last_name: worker.lastName,
      position: worker.position ?? worker.role ?? null,
      description: worker.description ?? null,
      email: worker.email ?? null,
      phone: worker.phone ?? null,
      photo_url: worker.photoUrl ?? null,
      service_ids: worker.services ? worker.services.map((service) => service.serviceId) : undefined,
      is_active: worker.isActive,
      created_at: worker.createdAt,
      updated_at: worker.updatedAt,
    };
  }

  static toPublicDto(worker: Worker): PublicWorkerDto {
    return {
      id: worker.id,
      first_name: worker.firstName,
      last_name: worker.lastName,
      position: worker.position ?? worker.role ?? null,
      description: worker.description ?? null,
      photo_url: worker.photoUrl ?? null,
    };
  }
}
