import { randomUUID } from 'crypto';

interface Category {
  id: string;
  salonId: string;
  crmExternalId?: string | null;
  name: string;
  color?: string | null;
  sortOrder?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Service {
  id: string;
  salonId: string;
  crmExternalId?: string | null;
  categoryId?: string | null;
  name: string;
  description?: string | null;
  durationMinutes: number;
  priceCents: number;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function createFakePrismaForServices() {
  const categories: Category[] = [];
  const services: Service[] = [];

  const categoryUpsert = ({ create }: any): Category => {
    let existing: Category | undefined;
    if (create.crmExternalId) {
      existing = categories.find(
        (c) => c.salonId === create.salonId && c.crmExternalId === create.crmExternalId,
      );
    }
    if (!existing) {
      existing = categories.find(
        (c) => c.salonId === create.salonId && c.name.toLowerCase() === create.name.toLowerCase(),
      );
    }
    if (existing) {
      Object.assign(existing, create, { updatedAt: new Date() });
      return existing;
    }
    const cat: Category = {
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...create,
    };
    categories.push(cat);
    return cat;
  };

  const serviceUpsert = ({ create }: any): Service => {
    let existing: Service | undefined;
    if (create.crmExternalId) {
      existing = services.find(
        (s) => s.salonId === create.salonId && s.crmExternalId === create.crmExternalId,
      );
    }
    if (!existing) {
      existing = services.find(
        (s) => s.salonId === create.salonId && s.name.toLowerCase() === create.name.toLowerCase(),
      );
    }
    if (existing) {
      Object.assign(existing, create, { updatedAt: new Date() });
      return existing;
    }
    const svc: Service = {
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...create,
    };
    services.push(svc);
    return svc;
  };

  const prisma = {
    category: {
      findMany: async (args: any = {}) => {
        const { where, orderBy } = args;
        let result = categories.filter((c) => {
          if (where?.salonId && c.salonId !== where.salonId) return false;
          if (where?.id?.in && !where.id.in.includes(c.id)) return false;
          return true;
        });
        if (orderBy?.sortOrder === 'asc') {
          result = result.sort((a, b) => {
            const aSort = a.sortOrder ?? 0;
            const bSort = b.sortOrder ?? 0;
            if (aSort !== bSort) return aSort - bSort;
            return a.name.localeCompare(b.name);
          });
        }
        return result;
      },
      upsert: async (args: any) => categoryUpsert(args),
      deleteMany: async (args: any) => {
        const ids: string[] = args?.where?.id?.in ?? [];
        let count = 0;
        ids.forEach((id) => {
          const idx = categories.findIndex((c) => c.id === id);
          if (idx !== -1) {
            categories.splice(idx, 1);
            count++;
          }
        });
        return { count };
      },
      create: async ({ data }: any) => categoryUpsert({ create: data }),
      update: async ({ where, data }: any) => {
        const existing = categories.find((c) => c.id === where.id);
        if (!existing) throw new Error('not found');
        Object.assign(existing, data, { updatedAt: new Date() });
        return existing;
      },
    },
    service: {
      findMany: async (args: any = {}) => {
        const { where, skip = 0, take } = args;
        let result = services.filter((s) => {
          if (where?.salonId && s.salonId !== where.salonId) return false;
          if (where?.categoryId && s.categoryId !== where.categoryId) return false;
          if (where?.isActive !== undefined && s.isActive !== where.isActive) return false;
          if (where?.OR) {
            const q = where.OR[0]?.name?.contains || where.OR[1]?.description?.contains;
            if (q) {
              const qLower = q.toLowerCase();
              const nameMatch = s.name.toLowerCase().includes(qLower);
              const descMatch = (s.description ?? '').toLowerCase().includes(qLower);
              if (!nameMatch && !descMatch) return false;
            }
          }
          return true;
        });
        const start = skip;
        const end = take !== undefined ? start + take : undefined;
        return result.slice(start, end);
      },
      count: async (args: any = {}) => {
        const all = await prisma.service.findMany(args);
        return all.length;
      },
      upsert: async (args: any) => serviceUpsert(args),
      deleteMany: async (args: any) => {
        const ids: string[] = args?.where?.id?.in ?? [];
        let count = 0;
        ids.forEach((id) => {
          const idx = services.findIndex((s) => s.id === id);
          if (idx !== -1) {
            services.splice(idx, 1);
            count++;
          }
        });
        return { count };
      },
      create: async ({ data }: any) => serviceUpsert({ create: data }),
      update: async ({ where, data }: any) => {
        const existing = services.find((s) => s.id === where.id);
        if (!existing) throw new Error('not found');
        Object.assign(existing, data, { updatedAt: new Date() });
        return existing;
      },
    },
    $transaction: async (actions: any[]) => Promise.all(actions),
    __db: { categories, services },
  };

  return prisma;
}
