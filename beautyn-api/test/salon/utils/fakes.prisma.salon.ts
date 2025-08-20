import { randomUUID } from 'crypto';

export function createFakePrismaForSalon() {
  const salons: any[] = [];
  const images: any[] = [];

  const matchSalon = (s: any, where: any = {}): boolean => {
    if (!where) return true;
    if (where.id && s.id !== where.id) return false;
    if (where.crmId && s.crmId !== where.crmId) return false;
    if (where.city && s.city !== where.city) return false;
    if (where.country && s.country !== where.country) return false;
    if (where.deletedAt === null && s.deletedAt !== null) return false;
    if (where.name && where.name.contains) {
      const q = String(where.name.contains).toLowerCase();
      if (!s.name.toLowerCase().includes(q)) return false;
    }
    return true;
  };

  const prisma: any = {
    salon: {
      findFirst: async ({ where }: any) => salons.find((s) => matchSalon(s, where)) || null,
      findUnique: async ({ where }: any) => salons.find((s) => s.id === where.id) || null,
      findMany: async ({ where, skip = 0, take, orderBy }: any) => {
        let result = salons.filter((s) => matchSalon(s, where));
        if (orderBy?.createdAt === 'desc') {
          result = result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
        if (skip) result = result.slice(skip);
        if (take !== undefined) result = result.slice(0, take);
        return result;
      },
      count: async ({ where }: any) => salons.filter((s) => matchSalon(s, where)).length,
      upsert: async ({ where, create, update }: any) => {
        const existing = salons.find((s) => s.id === where.id);
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const newSalon = {
          id: create.id ?? randomUUID(),
          createdAt: new Date(),
          deletedAt: null,
          ...create,
        };
        salons.push(newSalon);
        return newSalon;
      },
      update: async ({ where, data }: any) => {
        const existing = salons.find((s) => s.id === where.id);
        if (!existing) throw new Error('not found');
        Object.assign(existing, data);
        return existing;
      },
      create: async ({ data }: any) => {
        const newSalon = {
          id: data.id ?? randomUUID(),
          createdAt: new Date(),
          deletedAt: null,
          ...data,
        };
        salons.push(newSalon);
        return newSalon;
      },
    },
    salonImage: {
      findMany: async ({ where, orderBy }: any) => {
        let res = images.filter((i) => (where?.salonId === undefined || i.salonId === where.salonId));
        if (orderBy?.sortOrder === 'asc') {
          res = res.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        }
        return res;
      },
      deleteMany: async ({ where }: any) => {
        let count = 0;
        for (let i = images.length - 1; i >= 0; i--) {
          if (!where?.salonId || images[i].salonId === where.salonId) {
            images.splice(i, 1);
            count++;
          }
        }
        return { count };
      },
      createMany: async ({ data }: any) => {
        for (const d of data) {
          images.push({ id: randomUUID(), ...d });
        }
        return { count: data.length };
      },
    },
    $transaction: async (arg: any) => {
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      if (typeof arg === 'function') {
        return arg(prisma);
      }
      throw new Error('Unsupported transaction');
    },
  };

  return prisma;
}
