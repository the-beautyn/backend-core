import { randomUUID } from 'crypto';

// Domain test types (avoid conflict with lib.dom Worker)
export interface WorkerEntity {
  id: string;
  salonId: string;
  firstName: string;
  lastName: string;
  crmWorkerId?: string | null;
  position?: string | null;
  description?: string | null;
  email?: string;
  phone?: string | null;
  photoUrl?: string | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WorkerServiceLink {
  workerId: string;
  serviceId: string;
}

export interface ServiceRecord {
  id: string;
  salonId: string;
  crm_service_id: string;
}

export interface TextContains {
  contains?: string;
}

export interface WorkerWhere {
  salonId?: string;
  isActive?: boolean;
  email?: string;
  firstName?: string;
  lastName?: string;
  id?: string | { in?: string[] };
  OR?: Array<{ firstName?: TextContains; lastName?: TextContains }>;
}

export type WorkerCreateData = Omit<WorkerEntity, 'id'> & { id?: string };

export interface FakePrismaWorkersApi {
  worker: {
    findMany(args?: { where?: WorkerWhere; skip?: number; take?: number }): Promise<WorkerEntity[]>;
    count(args?: { where?: WorkerWhere }): Promise<number>;
    findUnique(args: { where: { id: string } }): Promise<WorkerEntity | null>;
    findFirst(args?: { where?: WorkerWhere }): Promise<WorkerEntity | null>;
    create(args: { data: WorkerCreateData }): Promise<WorkerEntity>;
    update(args: { where: { id: string }; data: Partial<WorkerEntity> }): Promise<WorkerEntity>;
    deleteMany(args: { where?: { salonId?: string; id?: string } }): Promise<{ count: number }>;
  };
  workerService: {
    deleteMany(args: { where: { workerId: string } }): Promise<{ count: number }>;
    createMany(args: { data: Array<{ workerId: string; serviceId: string }> }): Promise<{ count: number }>;
    findMany(args?: { where?: Partial<WorkerServiceLink> }): Promise<WorkerServiceLink[]>;
  };
  service: {
    findMany(args: { where: { salonId: string; crm_service_id?: { in?: string[] } } }): Promise<ServiceRecord[]>;
  };
  $queryRaw(query: { values?: unknown[] }): Promise<Array<{ id: string }>>;
  $transaction<T>(ops: Array<Promise<T>>): Promise<T[]>;
  data: { workers: WorkerEntity[]; workerServices: WorkerServiceLink[]; services: ServiceRecord[] };
}

export function createFakePrismaForWorkers(): FakePrismaWorkersApi {

  const workers: WorkerEntity[] = [];
  const workerServices: WorkerServiceLink[] = [];
  const services: ServiceRecord[] = [
    { id: 'svc1', salonId: 'salon1', crm_service_id: 'ext1' },
    { id: 'svc2', salonId: 'salon1', crm_service_id: 'ext2' },
    { id: 'svc3', salonId: 'salon1', crm_service_id: 'ext3' },
  ];

  const applyWorkerWhere = (where: WorkerWhere = {}): WorkerEntity[] => {
    return workers.filter((w: WorkerEntity) => {
      if (where.salonId && w.salonId !== where.salonId) return false;
      if (where.isActive !== undefined && w.isActive !== where.isActive)
        return false;
      if (where.email && w.email !== where.email) return false;
      if (where.firstName && w.firstName !== where.firstName) return false;
      if (where.lastName && w.lastName !== where.lastName) return false;
      if (where.OR && where.OR.length) {
        const q = (
          where.OR[0]?.firstName?.contains || where.OR[1]?.lastName?.contains || ''
        ).toLowerCase();
        const first = w.firstName.toLowerCase().includes(q);
        const last = w.lastName.toLowerCase().includes(q);
        if (!first && !last) return false;
      }
      return true;
    });
  };

  return {
    worker: {
      findMany: async (
        {
          where,
          skip = 0,
          take = workers.length,
        }: { where?: WorkerWhere; skip?: number; take?: number } = {},
      ): Promise<WorkerEntity[]> => applyWorkerWhere(where ?? {}).slice(skip, skip + take),
      count: async ({ where }: { where?: WorkerWhere } = {}): Promise<number> =>
        applyWorkerWhere(where ?? {}).length,
      findUnique: async ({ where: { id } }: { where: { id: string } }): Promise<WorkerEntity | null> =>
        workers.find((w) => w.id === id) || null,
      findFirst: async ({ where }: { where?: WorkerWhere } = {}): Promise<WorkerEntity | null> =>
        applyWorkerWhere(where ?? {})[0] || null,
      create: async ({ data }: { data: WorkerCreateData }): Promise<WorkerEntity> => {
        const worker: WorkerEntity = {
          id: data.id || randomUUID(),
          salonId: data.salonId,
          firstName: data.firstName,
          lastName: data.lastName,
          crmWorkerId: data.crmWorkerId ?? null,
          position: data.position ?? null,
          description: data.description ?? null,
          email: data.email,
           phone: data.phone ?? null,
           photoUrl: data.photoUrl ?? null,
          isActive: data.isActive,
          createdAt: data.createdAt ?? new Date(),
          updatedAt: data.updatedAt ?? new Date(),
        };
        workers.push(worker);
        return worker;
      },
      update: async ({ where: { id }, data }: { where: { id: string }; data: Partial<WorkerEntity> }): Promise<WorkerEntity> => {
        const idx = workers.findIndex((w) => w.id === id);
        if (idx === -1) throw new Error('not found');
        workers[idx] = { ...workers[idx], ...data, updatedAt: new Date() };
        return workers[idx];
      },
      deleteMany: async ({ where }: { where?: { salonId?: string; id?: string } }): Promise<{ count: number }> => {
        const before = workers.length;
        for (let i = workers.length - 1; i >= 0; i--) {
          const w = workers[i];
          if (
            (!where?.salonId || w.salonId === where.salonId) &&
            (!where?.id || w.id === where.id)
          ) {
            workers.splice(i, 1);
          }
        }
        return { count: before - workers.length };
      },
    },
    workerService: {
      deleteMany: async ({ where: { workerId } }: { where: { workerId: string } }): Promise<{ count: number }> => {
        const before = workerServices.length;
        for (let i = workerServices.length - 1; i >= 0; i--) {
          if (workerServices[i].workerId === workerId) {
            workerServices.splice(i, 1);
          }
        }
        return { count: before - workerServices.length };
      },
      createMany: async ({ data }: { data: Array<{ workerId: string; serviceId: string }> }): Promise<{ count: number }> => {
        for (const d of data) {
          workerServices.push({ workerId: d.workerId, serviceId: d.serviceId });
        }
        return { count: data.length };
      },
      findMany: async ({ where }: { where?: Partial<WorkerServiceLink> } = {}): Promise<WorkerServiceLink[]> =>
        workerServices.filter((ws) =>
          Object.entries(where || {}).every(([k, v]) => (ws as any)[k] === v),
        ),
    },
    service: {
      findMany: async ({ where: { salonId, crm_service_id } }: { where: { salonId: string; crm_service_id?: { in?: string[] } } }): Promise<ServiceRecord[]> => {
        return services.filter((s) => {
          if (s.salonId !== salonId) return false;
          if (crm_service_id && 'in' in crm_service_id) {
            const list = crm_service_id.in;
            if (!Array.isArray(list)) return false;
            return list.includes(s.crm_service_id);
          }
          return true;
        });
      },
    },
    $queryRaw: async (query: { values?: unknown[] }): Promise<Array<{ id: string }>> => {
      const values = (query.values || []) as string[];
      const salonId = values[0];
      const ids = values.slice(1);
      return services
        .filter((s) => s.salonId === salonId && ids.includes(s.crm_service_id))
        .map((s) => ({ id: s.id }));
    },
    $transaction: async <T>(ops: Array<Promise<T>>): Promise<T[]> => Promise.all(ops),
    data: { workers, workerServices, services },
  };
}
