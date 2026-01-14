import { startSalonsSyncWorker } from '@crm/sync-scheduler';

async function bootstrap() {
  try {
    const worker = startSalonsSyncWorker();
    console.log('Salons Sync Worker started');
    worker.on('error', (err: Error) => {
      console.error('Salons Sync Worker error', err);
    });
  } catch (err) {
    console.error('Failed to start Salons Sync Worker', err);
    process.exit(1);
  }
}

void bootstrap();
