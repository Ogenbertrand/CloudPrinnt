import { QUEUE_NAMES } from '@cloudprint/config';

/** Queue names only. No processor or Redis connection is started by this scaffold. */
export const WORKER_BLUEPRINT = {
  queues: QUEUE_NAMES,
  processes: ['outbox-dispatch', 'document-processing', 'reconciliation', 'notifications', 'retention'],
  documentConcurrency: 1,
  status: 'scaffold-only',
} as const;
