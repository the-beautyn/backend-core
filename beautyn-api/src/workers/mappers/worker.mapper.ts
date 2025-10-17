import { Worker, WorkerService } from '@prisma/client';
import { WorkerDto } from '../dto/worker.dto';
import { PublicWorkerDto } from '../dto/worker-public.dto';

export class WorkerMapper {
  static toDto(worker: Worker & { services?: WorkerService[] }): WorkerDto {
    return {
      id: worker.id,
      crmWorkerId: worker.crmWorkerId ?? null,
      salonId: worker.salonId,
      firstName: worker.firstName,
      lastName: worker.lastName,
      position: worker.position ?? worker.role ?? null,
      description: worker.description ?? null,
      email: worker.email ?? null,
      phone: worker.phone ?? null,
      photoUrl: worker.photoUrl ?? null,
      serviceIds: worker.services ? worker.services.map((service) => service.serviceId) : undefined,
      isActive: worker.isActive,
      createdAt: worker.createdAt,
      updatedAt: worker.updatedAt,
    };
  }

  static toPublicDto(worker: Worker): PublicWorkerDto {
    return {
      id: worker.id,
      firstName: worker.firstName,
      lastName: worker.lastName,
      position: worker.position ?? worker.role ?? null,
      description: worker.description ?? null,
      photoUrl: worker.photoUrl ?? null,
    };
  }
}
