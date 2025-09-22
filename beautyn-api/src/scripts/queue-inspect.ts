import { Queue, QueueEvents } from 'bullmq';
import { SYNC_QUEUE } from '@crm/sync-scheduler';

async function main() {
  const { REDIS_URL } = process.env as Record<string, string | undefined>;
  if (!REDIS_URL) throw new Error('REDIS_URL is required');

  const connection = { url: REDIS_URL } as any;
  const queue = new Queue(SYNC_QUEUE, { connection });
  const events = new QueueEvents(SYNC_QUEUE, { connection });

  const args = process.argv.slice(2);
  const cmd = args[0];
  const id = args[1];

  if (cmd === '--retry' && id) {
    const job = await queue.getJob(id);
    if (!job) throw new Error(`Job not found: ${id}`);
    await job.retry();
    // eslint-disable-next-line no-console
    console.log(`Retried job ${id}`);
  } else if (cmd === '--remove' && id) {
    const job = await queue.getJob(id);
    if (!job) throw new Error(`Job not found: ${id}`);
    await job.remove();
    // eslint-disable-next-line no-console
    console.log(`Removed job ${id}`);
  } else if (cmd === '--clean-failed') {
    const cleaned = await queue.clean(0, 1000, 'failed');
    // eslint-disable-next-line no-console
    console.log(`Cleaned failed jobs: ${cleaned.length}`);
  } else if (cmd === '--clean-completed') {
    const cleaned = await queue.clean(0, 1000, 'completed');
    // eslint-disable-next-line no-console
    console.log(`Cleaned completed jobs: ${cleaned.length}`);
  } else {
    // Default: inspect
    // eslint-disable-next-line no-console
    console.log(`Inspecting queue: ${SYNC_QUEUE}`);

    const [waiting, active, delayed, failed, completed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getDelayed(),
      queue.getFailed(),
      queue.getCompleted(),
    ]);

    const summarize = (jobs: any[]) => jobs.map((j) => ({ id: j.id, name: j.name, data: j.data })).slice(0, 50);

    // eslint-disable-next-line no-console
    console.log('Counts:', await queue.getJobCounts());
    // eslint-disable-next-line no-console
    console.log('Waiting (up to 50):', summarize(waiting));
    // eslint-disable-next-line no-console
    console.log('Active (up to 50):', summarize(active));
    // eslint-disable-next-line no-console
    console.log('Delayed (up to 50):', summarize(delayed));
    // eslint-disable-next-line no-console
    console.log('Failed (up to 50):', summarize(failed));
    // eslint-disable-next-line no-console
    console.log('Completed (up to 50):', summarize(completed));
  }

  await events.close();
  await queue.close();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Queue inspect failed', err);
  process.exit(1);
});


