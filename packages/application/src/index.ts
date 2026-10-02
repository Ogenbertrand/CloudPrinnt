import type { PaymentAttempt, PaymentStatus, PreparedDocument, PrintJob } from '@cloudprint/domain';

export interface ProviderPaymentResult {
  readonly status: Exclude<PaymentStatus, 'CREATED'>;
  readonly merchantReference: string;
  readonly gatewayReference: string | null;
  readonly amountXaf: number | null;
  readonly currency: string | null;
}

/** An adapter must define how it authenticates callbacks and resolves request ambiguity. */
export interface PaymentGateway {
  readonly providerId: string;
  createCollection(attempt: PaymentAttempt): Promise<ProviderPaymentResult>;
  queryCollection(attempt: PaymentAttempt): Promise<ProviderPaymentResult>;
  verifyCallback(rawBody: Uint8Array, headers: Readonly<Record<string, string>>): Promise<ProviderPaymentResult>;
}

export interface FileStore {
  put(key: string, bytes: AsyncIterable<Uint8Array>, maxBytes: number): Promise<{ sizeBytes: number; sha256: string }>;
  read(key: string): AsyncIterable<Uint8Array>;
  delete(key: string): Promise<void>;
}

export interface DocumentProcessor {
  prepare(input: { documentId: string; sourceKey: string; format: 'PDF' | 'DOCX' }): Promise<PreparedDocument>;
}

export interface OutboxEvent {
  readonly id: string;
  readonly shopId: string;
  readonly aggregateId: string;
  readonly aggregateVersion: number;
  readonly type: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly occurredAt: string;
}

/** Supplied by a single DB transaction; do not implement with independent commits. */
export interface TransactionContext {
  getJobForUpdate(jobId: string): Promise<PrintJob | null>;
  saveJob(job: PrintJob, expectedVersion: number): Promise<void>;
  savePaymentAttempt(attempt: PaymentAttempt): Promise<void>;
  appendOutbox(event: OutboxEvent): Promise<void>;
}

export interface UnitOfWork {
  run<T>(work: (transaction: TransactionContext) => Promise<T>): Promise<T>;
}

export interface WhatsAppTransport {
  sendText(message: { messageId: string; recipient: string; text: string }): Promise<{ transportReference: string }>;
}
