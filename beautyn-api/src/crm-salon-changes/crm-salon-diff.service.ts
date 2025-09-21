import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, CrmSalonChangeStatus } from '@prisma/client';
import { PrismaService } from '../shared/database/prisma.service';
import { canonicalHash, canonicalize, equalCanonical, CanonicalValue } from './crm-salon-normalizer';
import { SalonData } from '@crm/provider-core';

type TrackedField = {
  path: string;
  getCrm: (payload: SalonData | null) => unknown;
  getLocal: (snapshot: LocalSalonSnapshot) => unknown;
};

type LocalSalonSnapshot = {
  name: unknown;
  description: unknown;
  mainImageUrl: unknown;
  imageUrls: string[];
  location: {
    country: unknown;
    city: unknown;
    addressLine: unknown;
    lat: unknown;
    lon: unknown;
  };
  workingSchedule: unknown;
  timezone: unknown;
};

type PendingOperation = {
  path: string;
  hash: string;
  crmValue: CanonicalValue;
  localValue: CanonicalValue;
  requiresProposal: boolean;
};

function toPrismaJson(value: CanonicalValue): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  return value === null ? Prisma.JsonNull : (value as unknown as Prisma.InputJsonValue);
}

function buildLocalSnapshot(salon: Prisma.SalonGetPayload<{ include: { images: true } }>): LocalSalonSnapshot {
  return {
    name: salon.name ?? null,
    description: salon.description ?? null,
    mainImageUrl: salon.coverImageUrl ?? null,
    imageUrls: (salon.images || []).map((img) => img.imageUrl).filter((url): url is string => typeof url === 'string' && url.length > 0),
    location: {
      country: salon.country ?? null,
      city: salon.city ?? null,
      addressLine: salon.addressLine ?? null,
      lat: salon.latitude != null ? Number(salon.latitude) : null,
      lon: salon.longitude != null ? Number(salon.longitude) : null,
    },
    workingSchedule: salon.workingSchedule ?? null,
    timezone: salon.timezone ?? null,
  };
}

const TRACKED_FIELDS: TrackedField[] = [
  { path: 'name', getCrm: (payload) => payload?.name, getLocal: (snapshot) => snapshot.name },
  { path: 'description', getCrm: (payload) => payload?.description, getLocal: (snapshot) => snapshot.description },
  { path: 'mainImageUrl', getCrm: (payload) => payload?.mainImageUrl, getLocal: (snapshot) => snapshot.mainImageUrl },
  { path: 'imageUrls', getCrm: (payload) => payload?.imageUrls, getLocal: (snapshot) => snapshot.imageUrls },
  { path: 'location.country', getCrm: (payload) => payload?.location?.country, getLocal: (snapshot) => snapshot.location.country },
  { path: 'location.city', getCrm: (payload) => payload?.location?.city, getLocal: (snapshot) => snapshot.location.city },
  { path: 'location.addressLine', getCrm: (payload) => payload?.location?.addressLine, getLocal: (snapshot) => snapshot.location.addressLine },
  { path: 'location.lat', getCrm: (payload) => payload?.location?.lat, getLocal: (snapshot) => snapshot.location.lat },
  { path: 'location.lon', getCrm: (payload) => payload?.location?.lon, getLocal: (snapshot) => snapshot.location.lon },
  { path: 'workingSchedule', getCrm: (payload) => payload?.workingSchedule, getLocal: (snapshot) => snapshot.workingSchedule },
  { path: 'timezone', getCrm: (payload) => payload?.timezone, getLocal: (snapshot) => snapshot.timezone },
];

@Injectable()
export class CrmSalonDiffService {
  private readonly logger = new Logger(CrmSalonDiffService.name);

  constructor(private readonly prisma: PrismaService) {}

  async detectChanges(salonId: string, provider: string, crmPayload: SalonData | null): Promise<void> {
    if (!salonId) throw new BadRequestException('salonId required');
    if (!provider) throw new BadRequestException('provider required');

    const salon = await this.prisma.salon.findUnique({
      where: { id: salonId },
      include: { images: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!salon) throw new NotFoundException('Salon not found');

    const providerKey = provider ?? salon.provider;
    if (!providerKey) {
      throw new BadRequestException('CRM provider not linked to salon');
    }

    const localSnapshot = buildLocalSnapshot(salon);
    const lastHashes = await this.prisma.crmSalonLastHash.findMany({ where: { salonId, provider: providerKey } });
    const lastHashMap = new Map(lastHashes.map((entry) => [entry.fieldPath, entry.lastCrmHash] as const));

    const now = new Date();
    const operations: PendingOperation[] = [];

    for (const field of TRACKED_FIELDS) {
      const pathParts = field.path.split('.');
      const crmValueRaw = field.getCrm(crmPayload ?? null);
      if (crmValueRaw === undefined) {
        continue;
      }
      const crmCanonical = canonicalize(crmValueRaw, pathParts);
      const newHash = canonicalHash(crmValueRaw, pathParts);
      const previousHash = lastHashMap.get(field.path);
      if (previousHash === newHash) {
        continue;
      }

      const localValueRaw = field.getLocal(localSnapshot);
      const localCanonical = canonicalize(localValueRaw, pathParts);
      const requiresProposal = previousHash !== undefined && !equalCanonical(crmValueRaw, localValueRaw, pathParts);

      operations.push({
        path: field.path,
        hash: newHash,
        crmValue: crmCanonical,
        localValue: localCanonical,
        requiresProposal,
      });
    }

    if (!operations.length && crmPayload) {
      // Still persist snapshot if requested.
      await this.prisma.crmSalonSnapshot.create({
        data: {
          salonId,
          provider: providerKey,
          payloadJson: crmPayload,
          payloadHash: canonicalHash(crmPayload),
          fetchedAt: now,
        },
      });
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      if (crmPayload) {
        await tx.crmSalonSnapshot.create({
          data: {
            salonId,
            provider: providerKey,
            payloadJson: crmPayload,
            payloadHash: canonicalHash(crmPayload),
            fetchedAt: now,
          },
        }).catch((err) => {
          this.logger.warn(`Failed to store CRM snapshot: ${err instanceof Error ? err.message : String(err)}`);
        });
      }

      for (const op of operations) {
        await tx.crmSalonLastHash.upsert({
          where: {
            salonId_provider_fieldPath: {
              salonId,
              provider,
              fieldPath: op.path,
            },
          },
          update: { lastCrmHash: op.hash },
          create: {
            salonId,
            provider: providerKey,
            fieldPath: op.path,
            lastCrmHash: op.hash,
          },
        });
      }

      for (const op of operations.filter((o) => o.requiresProposal)) {
        try {
          await tx.crmSalonChangeProposal.create({
            data: {
              salonId,
              provider: providerKey,
              fieldPath: op.path,
              oldValue: toPrismaJson(op.localValue),
              newValue: toPrismaJson(op.crmValue),
              newHash: op.hash,
              status: CrmSalonChangeStatus.pending,
              detectedAt: now,
            },
          });
        } catch (err) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            continue;
          }
          throw err;
        }
      }
    });
  }

  async acceptChange(id: string, actorId: string): Promise<void> {
    if (!actorId) throw new BadRequestException('actorId required');

    await this.prisma.$transaction(async (tx) => {
      const proposal = await tx.crmSalonChangeProposal.findUnique({
        where: { id },
        include: { salon: { select: { ownerUserId: true } } },
      });
      if (!proposal) throw new NotFoundException('Proposal not found');
      if (proposal.status !== CrmSalonChangeStatus.pending) {
        throw new BadRequestException('Proposal already resolved');
      }
      if (proposal.fieldPath === 'externalId') {
        throw new BadRequestException('Cannot accept changes to externalId');
      }
      if (proposal.salon.ownerUserId !== actorId) {
        throw new ForbiddenException('Access denied');
      }

      await applyFieldPatch(tx, proposal.salonId, proposal.fieldPath, proposal.newValue);

      await tx.crmSalonChangeProposal.update({
        where: { id },
        data: {
          status: CrmSalonChangeStatus.accepted,
          decidedAt: new Date(),
          decidedBy: actorId,
        },
      });
    });
  }

  async dismissChange(id: string, actorId: string): Promise<void> {
    if (!actorId) throw new BadRequestException('actorId required');

    await this.prisma.$transaction(async (tx) => {
      const proposal = await tx.crmSalonChangeProposal.findUnique({
        where: { id },
        include: { salon: { select: { ownerUserId: true } } },
      });
      if (!proposal) throw new NotFoundException('Proposal not found');
      if (proposal.status !== CrmSalonChangeStatus.pending) {
        throw new BadRequestException('Proposal already resolved');
      }
      if (proposal.salon.ownerUserId !== actorId) {
        throw new ForbiddenException('Access denied');
      }

      await tx.crmSalonChangeProposal.update({
        where: { id },
        data: {
          status: CrmSalonChangeStatus.dismissed,
          decidedAt: new Date(),
          decidedBy: actorId,
        },
      });
    });
  }

  async listChanges(actorId: string, salonId: string, status?: CrmSalonChangeStatus) {
    if (!actorId) throw new BadRequestException('actorId required');
    if (!salonId) throw new BadRequestException('salonId required');

    const salon = await this.prisma.salon.findUnique({
      where: { id: salonId },
      select: { ownerUserId: true },
    });
    if (!salon) throw new NotFoundException('Salon not found');
    if (salon.ownerUserId !== actorId) throw new ForbiddenException('Access denied');

    const proposals = await this.prisma.crmSalonChangeProposal.findMany({
      where: {
        salonId,
        ...(status ? { status } : {}),
      },
      orderBy: { detectedAt: 'desc' },
    });
    return proposals;
  }
}

async function applyFieldPatch(tx: Prisma.TransactionClient, salonId: string, fieldPath: string, value: Prisma.InputJsonValue | null) {
  const scalar = (next: string | null, key: keyof Prisma.SalonUpdateInput) =>
    tx.salon.update({ where: { id: salonId }, data: { [key]: next } as Prisma.SalonUpdateInput });

  switch (fieldPath) {
    case 'name':
      await scalar(typeof value === 'string' ? value : null, 'name');
      return;
    case 'description':
      await scalar(typeof value === 'string' ? value : null, 'description');
      return;
    case 'mainImageUrl':
      await scalar(typeof value === 'string' ? value : null, 'coverImageUrl');
      return;
    case 'workingSchedule':
      await scalar(typeof value === 'string' ? value : null, 'workingSchedule');
      return;
    case 'timezone':
      await scalar(typeof value === 'string' ? value : null, 'timezone');
      return;
    case 'location.country':
      await scalar(typeof value === 'string' ? value : null, 'country');
      return;
    case 'location.city':
      await scalar(typeof value === 'string' ? value : null, 'city');
      return;
    case 'location.addressLine':
      await scalar(typeof value === 'string' ? value : null, 'addressLine');
      return;
    case 'location.lat': {
      const next = typeof value === 'number' ? value : value != null ? Number(value) : null;
      await tx.salon.update({
        where: { id: salonId },
        data: { latitude: next != null ? new Prisma.Decimal(next) : null },
      });
      return;
    }
    case 'location.lon': {
      const next = typeof value === 'number' ? value : value != null ? Number(value) : null;
      await tx.salon.update({
        where: { id: salonId },
        data: { longitude: next != null ? new Prisma.Decimal(next) : null },
      });
      return;
    }
    case 'imageUrls': {
      const urls = Array.isArray(value)
        ? (value.filter((v): v is string => typeof v === 'string' && v.length > 0) as string[])
        : [];
      await tx.salonImage.deleteMany({ where: { salonId } });
      if (urls.length) {
        await tx.salonImage.createMany({
          data: urls.map((url, index) => ({
            salonId,
            imageUrl: url,
            sortOrder: index,
          })),
        });
      }
      await tx.salon.update({ where: { id: salonId }, data: { imagesCount: urls.length } });
      return;
    }
    default:
      throw new BadRequestException(`Unsupported field path: ${fieldPath}`);
  }
}
