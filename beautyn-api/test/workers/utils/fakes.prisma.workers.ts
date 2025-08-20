import { randomUUID } from 'crypto';

export function createFakePrismaForWorkers() {
  const workers: any[] = [];
  const workerServices: any[] = [];
  const services: Array<{ id: string; salonId: string; crm_external_id: string }> = [
    { id: 'svc1', salonId: 'salon1', crm_external_id: 'ext1' },
    { id: 'svc2', salonId: 'salon1', crm_external_id: 'ext2' },
    { id: 'svc3', salonId: 'salon1', crm_external_id: 'ext3' },
  ];

  const applyWorkerWhere = (where: any = {}) => {
    return workers.filter((w) => {
      if (where.salonId && w.salonId !== where.salonId) return false;
      if (where.isActive !== undefined && w.isActive !== where.isActive)
        return false;
      if (where.email && w.email !== where.email) return false;
      if (where.firstName && w.firstName !== where.firstName) return false;
      if (where.lastName && w.lastName !== where.lastName) return false;
      if (where.OR && where.OR.length) {
        const q = (where.OR[0].firstName?.contains || where.OR[1].lastName?.contains || '').toLowerCase();
        const first = w.firstName.toLowerCase().includes(q);
        const last = w.lastName.toLowerCase().includes(q);
        if (!first && !last) return false;
      }
      return true;
    });
  };

  return {
    worker: {
      findMany: async ({ where, skip = 0, take = workers.length } = {} as any) =>
        applyWorkerWhere(where).slice(skip, skip + take),
      count: async ({ where } = {} as any) => applyWorkerWhere(where).length,
      findUnique: async ({ where: { id } }: any) =>
        workers.find((w) => w.id === id) || null,
      findFirst: async ({ where }: any) => applyWorkerWhere(where)[0] || null,
      create: async ({ data }: any) => {
        const worker = { id: data.id || randomUUID(), ...data };
        workers.push(worker);
        return worker;
      },
      update: async ({ where: { id }, data }: any) => {
        const idx = workers.findIndex((w) => w.id === id);
        if (idx === -1) throw new Error('not found');
        workers[idx] = { ...workers[idx], ...data };
        return workers[idx];
      },
      deleteMany: async ({ where }: any) => {
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
      deleteMany: async ({ where: { workerId } }: any) => {
        const before = workerServices.length;
        for (let i = workerServices.length - 1; i >= 0; i--) {
          if (workerServices[i].workerId === workerId) {
            workerServices.splice(i, 1);
          }
        }
        return { count: before - workerServices.length };
      },
      createMany: async ({ data }: any) => {
        for (const d of data) {
          workerServices.push({ workerId: d.workerId, serviceId: d.serviceId });
        }
        return { count: data.length };
      },
      findMany: async ({ where }: any) =>
        workerServices.filter((ws) =>
          Object.keys(where || {}).every((k) => (ws as any)[k] === where[k]),
        ),
    },
    service: {
      findMany: async ({ where: { salonId, crm_external_id } }: any) =>
        services.filter(
          (s) =>
            s.salonId === salonId &&
            crm_external_id?.in?.includes(s.crm_external_id),
        ),
    },
    $queryRaw: async (query: any) => {
      const values: any[] = query.values || [];
      const salonId = values[0];
      const ids = values.slice(1);
      return services
        .filter((s) => s.salonId === salonId && ids.includes(s.crm_external_id))
        .map((s) => ({ id: s.id }));
    },
    $transaction: async (ops: any[]) => Promise.all(ops),
    data: { workers, workerServices, services },
  } as any;
}

