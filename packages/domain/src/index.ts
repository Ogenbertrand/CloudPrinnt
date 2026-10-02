/** Domain vocabulary. Persistence and integration behavior are not implemented yet. */
export type ColorMode = 'MONOCHROME' | 'COLOR';
export type DocumentStatus = 'RECEIVED' | 'PROCESSING' | 'READY' | 'REJECTED';
export type JobStatus =
  | 'PENDING_CONFIG'
  | 'PENDING_PAYMENT'
  | 'PAID_QUEUE'
  | 'RESERVED'
  | 'SUBMITTED'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'FULFILMENT_REVIEW';
export type PaymentStatus = 'CREATED' | 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'UNKNOWN';
export type PrintAttemptStatus = 'PREPARED' | 'SUBMITTING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED' | 'UNKNOWN';
export type RefundStatus = 'REQUESTED' | 'PENDING' | 'REFUNDED' | 'FAILED' | 'UNKNOWN';

export interface PrintSettings {
  readonly colorMode: ColorMode;
  readonly copies: number;
  readonly paperSize: 'A4';
  readonly sides: 'SIMPLEX';
}

/** All amounts require nonnegative safe-integer validation at the application boundary. */
export interface QuoteSnapshot {
  readonly currency: 'XAF';
  readonly pageCount: number;
  readonly settings: PrintSettings;
  readonly unitPriceXaf: number;
  readonly subtotalXaf: number;
  readonly convenienceFeeXaf: number;
  readonly totalAmountXaf: number;
  readonly pricingVersion: string;
  readonly preparedPdfSha256: string;
  readonly expiresAt: string;
}

export interface PreparedDocument {
  readonly documentId: string;
  readonly storageKey: string;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly pageCount: number;
}

export interface PrintJob {
  readonly id: string;
  readonly shopId: string;
  readonly documentId: string;
  readonly userPhoneNumber: string;
  readonly status: JobStatus;
  readonly quote: QuoteSnapshot | null;
  readonly ticketCode: string | null;
  readonly reservedDeviceId: string | null;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PaymentAttempt {
  readonly id: string;
  readonly jobId: string;
  readonly provider: string;
  readonly merchantReference: string;
  readonly gatewayReference: string | null;
  readonly payerPhoneNumber: string;
  readonly status: PaymentStatus;
  readonly amountXaf: number;
  readonly currency: 'XAF';
  readonly idempotencyKey: string;
}

export interface DeviceReservation {
  readonly id: string;
  readonly jobId: string;
  readonly shopId: string;
  readonly deviceId: string;
  readonly document: PreparedDocument;
  readonly settings: PrintSettings;
  readonly jobVersion: number;
}
