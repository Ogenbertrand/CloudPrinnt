import type { PaymentAttempt, PreparedDocument, PrintJob, PrintSettings, QuoteSnapshot } from '@cloudprint/domain';

export interface PriceMatrix {
  readonly monochromePageXaf: number;
  readonly colorPageXaf: number;
  readonly convenienceFeeXaf: number;
  readonly pricingVersion: string;
  readonly quoteTtlMs: number;
}

function assertWholeXaf(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label} must be a non-negative safe integer.`);
}

function assertSettings(settings: PrintSettings): void {
  if (!Number.isSafeInteger(settings.copies) || settings.copies < 1 || settings.copies > 100) {
    throw new Error('Copy count must be an integer from 1 to 100.');
  }
  if (settings.paperSize !== 'A4' || settings.sides !== 'SIMPLEX') {
    throw new Error('Only A4 simplex printing is currently supported.');
  }
}

function assertTicketCode(ticketCode: string): void {
  if (!/^#XAF-[A-Z0-9]{4,12}$/.test(ticketCode)) throw new Error('Ticket code has an invalid format.');
}

export function buildQuote(
  prepared: PreparedDocument,
  settings: PrintSettings,
  prices: PriceMatrix,
  now: Date,
): QuoteSnapshot {
  if (!Number.isSafeInteger(prepared.pageCount) || prepared.pageCount < 1) {
    throw new Error('A prepared document needs at least one verified page.');
  }
  assertSettings(settings);
  assertWholeXaf(prices.monochromePageXaf, 'Monochrome page price');
  assertWholeXaf(prices.colorPageXaf, 'Color page price');
  assertWholeXaf(prices.convenienceFeeXaf, 'Convenience fee');
  if (!Number.isSafeInteger(prices.quoteTtlMs) || prices.quoteTtlMs <= 0) throw new Error('Quote TTL must be positive.');
  if (prices.pricingVersion.trim().length === 0) throw new Error('Pricing version is required.');

  const unitPriceXaf = settings.colorMode === 'COLOR' ? prices.colorPageXaf : prices.monochromePageXaf;
  const subtotalXaf = unitPriceXaf * prepared.pageCount * settings.copies;
  const totalAmountXaf = subtotalXaf + prices.convenienceFeeXaf;
  assertWholeXaf(subtotalXaf, 'Subtotal');
  assertWholeXaf(totalAmountXaf, 'Total amount');

  return {
    currency: 'XAF',
    pageCount: prepared.pageCount,
    settings,
    unitPriceXaf,
    subtotalXaf,
    convenienceFeeXaf: prices.convenienceFeeXaf,
    totalAmountXaf,
    pricingVersion: prices.pricingVersion,
    preparedPdfSha256: prepared.sha256,
    expiresAt: new Date(now.getTime() + prices.quoteTtlMs).toISOString(),
  };
}

export function configureJob(input: {
  readonly job: PrintJob;
  readonly prepared: PreparedDocument;
  readonly settings: PrintSettings;
  readonly prices: PriceMatrix;
  readonly now: Date;
}): PrintJob {
  if (input.job.status !== 'PENDING_CONFIG') throw new Error('Only a pending-config job can receive a quote.');
  if (input.job.documentId !== input.prepared.documentId) throw new Error('Prepared document does not belong to this job.');
  const quote = buildQuote(input.prepared, input.settings, input.prices, input.now);
  return {
    ...input.job,
    status: 'PENDING_PAYMENT',
    quote,
    version: input.job.version + 1,
    updatedAt: input.now.toISOString(),
  };
}

export function beginPayment(input: {
  readonly job: PrintJob;
  readonly now: Date;
}): PrintJob {
  if (input.job.status !== 'PENDING_PAYMENT' || input.job.quote === null) {
    throw new Error('Only a quoted job can start a payment attempt.');
  }
  if (new Date(input.job.quote.expiresAt).getTime() <= input.now.getTime()) {
    throw new Error('The quote has expired.');
  }
  return {
    ...input.job,
    status: 'PROCESSING_PAYMENT',
    version: input.job.version + 1,
    updatedAt: input.now.toISOString(),
  };
}

export function markPaymentSucceeded(input: {
  readonly job: PrintJob;
  readonly payment: PaymentAttempt;
  readonly ticketCode: string;
  readonly now: Date;
}): PrintJob {
  if (input.job.status !== 'PROCESSING_PAYMENT' || input.job.quote === null) {
    throw new Error('Only a payment-processing job can enter the print queue.');
  }
  if (input.payment.jobId !== input.job.id || input.payment.status !== 'SUCCEEDED') {
    throw new Error('Payment result does not prove payment for this job.');
  }
  if (input.payment.currency !== 'XAF' || input.payment.amountXaf !== input.job.quote.totalAmountXaf) {
    throw new Error('Payment amount does not match the accepted quote.');
  }
  assertTicketCode(input.ticketCode);
  return {
    ...input.job,
    status: 'PAID_QUEUE',
    ticketCode: input.ticketCode,
    version: input.job.version + 1,
    updatedAt: input.now.toISOString(),
  };
}
