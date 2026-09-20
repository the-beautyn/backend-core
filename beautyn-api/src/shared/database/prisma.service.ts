import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Interactive-transaction budget for the whole app. Prisma's defaults (2 s to start,
 * 5 s to finish) date from before BEA-71: a booking write now takes the salon's
 * advisory lock inside its transaction, and time spent waiting on that lock counts
 * against the budget. A write queued behind another lane's transaction — or behind a
 * locked counter recompute of a 200-client chunk — must wait, not fail with P2028.
 */
export const TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 30_000 } as const;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({ transactionOptions: TRANSACTION_OPTIONS });
  }
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
