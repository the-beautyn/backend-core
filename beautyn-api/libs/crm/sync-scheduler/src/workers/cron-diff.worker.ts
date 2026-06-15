import { NestFactory } from '@nestjs/core';
import { ProviderCoreModule, ProviderFactory } from '@crm/provider-core';
import { startCronDiffWorker, SyncSchedulerService } from '@crm/sync-scheduler';

function envBool(name: string, def = false): boolean {
  const v = process.env[name];
  return v == null ? def : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}

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
  const worker = startCronDiffWorker({ providerFactory });

  // Register the two-lane bookings-dispatch schedules (fast 2-min / slow 90-min). Master flag off
  // → no schedules registered → no polling (today's behavior). Flip off + restart to stop polling.
  if (envBool('BOOKINGS_LANES_ENABLED')) {
    await new SyncSchedulerService().registerBookingsDispatchSchedules();
    // eslint-disable-next-line no-console
    console.log('Bookings dispatch schedules registered (fast + slow lanes)');
  }

  // Keep process alive; attach graceful shutdown
  const shutdown = async () => {
    try { await (worker as any)?.close?.(); } catch {}
    try { await app.close(); } catch {}
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // eslint-disable-next-line no-console
  console.log('Cron Diff Worker started');
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start Cron Diff Worker', err);
  process.exit(1);
});