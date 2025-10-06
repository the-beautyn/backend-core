import { NestFactory } from '@nestjs/core';
import { ProviderCoreModule, ProviderFactory } from '@crm/provider-core';
import { startCategoriesSyncWorker } from '@crm/sync-scheduler';

async function bootstrap() {
  const { REDIS_URL } = process.env as Record<string, string | undefined>;
  if (!REDIS_URL) {
    // BullMQ worker requires Redis URL
    throw new Error('REDIS_URL is required');
  }

  const app = await NestFactory.createApplicationContext(ProviderCoreModule, {
    logger: ['error', 'warn', 'log'],
  });

  const providerFactory = app.get(ProviderFactory);
  const worker = startCategoriesSyncWorker({ providerFactory });
  // Keep process alive; attach graceful shutdown
  const shutdown = async () => {
    try { await (worker as any)?.close?.(); } catch {}
    try { await app.close(); } catch {}
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // eslint-disable-next-line no-console
  console.log('Categories Sync Worker started');
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start Categories Sync Worker', err);
  process.exit(1);
});