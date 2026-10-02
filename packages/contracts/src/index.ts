import type { DeviceReservation, PrintAttemptStatus } from '@cloudprint/domain';

/** JSON wire proposals. Add runtime schemas/OpenAPI and generated Dart before integration. */
export interface QueueChangedEvent {
  readonly schemaVersion: 1;
  readonly eventId: string;
  readonly type: 'shop.queue.changed';
  readonly shopId: string;
  readonly jobId: string;
  readonly aggregateVersion: number;
  readonly occurredAt: string;
}

export interface CommandMetadata {
  readonly commandId: string;
  readonly expectedVersion: number;
}

export interface ReserveJobCommand extends CommandMetadata {
  readonly jobId: string;
}

export interface ReservationResponse {
  readonly schemaVersion: 1;
  readonly reservation: DeviceReservation;
}

export interface ReportPrintAttemptCommand extends CommandMetadata {
  readonly jobId: string;
  readonly reservationId: string;
  readonly attemptId: string;
  readonly printerId: string;
  readonly status: PrintAttemptStatus;
  readonly spoolerJobId: string | null;
  readonly occurredAt: string;
}

export const DOCUMENT_ERROR_CODES = [
  'FILE_TOO_LARGE', 'UNSUPPORTED_FORMAT', 'FORMAT_MISMATCH',
  'PASSWORD_PROTECTED', 'CORRUPT_DOCUMENT', 'EMPTY_DOCUMENT',
  'PAGE_LIMIT_EXCEEDED', 'CONVERSION_FAILED', 'PROCESSING_TIMEOUT',
  'RESOURCE_LIMIT_EXCEEDED',
] as const;
export type DocumentErrorCode = typeof DOCUMENT_ERROR_CODES[number];
