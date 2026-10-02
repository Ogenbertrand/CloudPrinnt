import assert from 'node:assert/strict';
import test from 'node:test';
import { beginPayment, configureJob, markPaymentSucceeded } from '../src/print-workflow.js';
import type { PaymentAttempt, PreparedDocument, PrintJob, PrintSettings } from '@cloudprint/domain';

const now = new Date('2026-10-02T14:00:00.000Z');
const settings: PrintSettings = { colorMode: 'MONOCHROME', copies: 2, paperSize: 'A4', sides: 'SIMPLEX' };
const prepared: PreparedDocument = {
  documentId: 'document-1', storageKey: 'prepared/document-1.pdf',
  sha256: 'a'.repeat(64), sizeBytes: 1000, pageCount: 3,
};
const pendingJob: PrintJob = {
  id: 'job-1', shopId: 'shop-1', documentId: 'document-1', userPhoneNumber: '+237600000000',
  status: 'PENDING_CONFIG', quote: null, ticketCode: null, reservedDeviceId: null,
  version: 1, createdAt: now.toISOString(), updatedAt: now.toISOString(),
};
const prices = { monochromePageXaf: 25, colorPageXaf: 100, convenienceFeeXaf: 50, pricingVersion: 'shop-1-2026-10', quoteTtlMs: 300_000 };

test('configures a job, locks payment, and queues only a matching successful payment', () => {
  const quoted = configureJob({ job: pendingJob, prepared, settings, prices, now });
  assert.equal(quoted.status, 'PENDING_PAYMENT');
  assert.equal(quoted.quote?.totalAmountXaf, 200);

  const processing = beginPayment({ job: quoted, now });
  const payment: PaymentAttempt = {
    id: 'payment-1', jobId: processing.id, provider: 'mock', merchantReference: 'merchant-1',
    gatewayReference: 'gateway-1', payerPhoneNumber: processing.userPhoneNumber,
    status: 'SUCCEEDED', amountXaf: 200, currency: 'XAF', idempotencyKey: 'idempotency-1',
  };
  const queued = markPaymentSucceeded({ job: processing, payment, ticketCode: '#XAF-402A', now });
  assert.equal(queued.status, 'PAID_QUEUE');
  assert.equal(queued.ticketCode, '#XAF-402A');
  assert.equal(queued.version, 4);
});

test('refuses an amount mismatch even after a provider reports success', () => {
  const quoted = configureJob({ job: pendingJob, prepared, settings, prices, now });
  const processing = beginPayment({ job: quoted, now });
  const payment: PaymentAttempt = {
    id: 'payment-1', jobId: processing.id, provider: 'mock', merchantReference: 'merchant-1',
    gatewayReference: 'gateway-1', payerPhoneNumber: processing.userPhoneNumber,
    status: 'SUCCEEDED', amountXaf: 199, currency: 'XAF', idempotencyKey: 'idempotency-1',
  };
  assert.throws(() => markPaymentSucceeded({ job: processing, payment, ticketCode: '#XAF-402A', now }));
});
