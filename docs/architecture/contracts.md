# API and realtime contract plan

These are design contracts, not implemented endpoints. All external schemas will be versioned; TypeScript types alone are not wire validation. The implementation phase should generate a Dart client from the approved OpenAPI schema and validate incoming JSON at runtime.

## Authorization

Staff tokens include authenticated identity and server-resolved shop memberships/roles. Device tokens identify one paired device and shop. Every read, command, download, and room join checks resource ownership. No arbitrary client-provided `shop_id` becomes trusted without this check.

## Planned REST surface

| Method and route | Purpose | Guard |
| --- | --- | --- |
| POST /v1/devices/pair | Redeem single-use pairing code | Expiring code + rate limit |
| POST /v1/devices/heartbeat | Update capabilities and presence | Device scope |
| GET /v1/shops/:shopId/jobs | Authoritative active-job snapshot | Shop member / paired device |
| GET /v1/jobs/:jobId | Job detail and aggregate version | Same shop |
| POST /v1/jobs/:jobId/reservations | Atomic device assignment | Device + paid state + expected version |
| GET /v1/jobs/:jobId/document | Stream immutable prepared PDF | Owning device reservation |
| POST /v1/jobs/:jobId/print-attempts | Report local attempt/journal transition | Owning device + valid transition |
| POST /v1/jobs/:jobId/ready | Staff confirms physical output | Staff identity + reservation scope |
| POST /v1/jobs/:jobId/collect | Confirm ticket handover | Staff identity + READY_FOR_PICKUP |
| POST /v1/jobs/:jobId/reprints | Authorize another physical attempt | Staff role + reason + reviewed prior attempt |
| POST /v1/jobs/:jobId/refund-requests | Start refund review | Authorized role + fulfilment reconciliation |
| POST /v1/webhooks/payments/:provider | Receive a provider result | Provider-specific verification |

Mutations carry `Idempotency-Key` and `expectedVersion`. Scope the key to authenticated actor and operation; store a request hash and the outcome. Reuse with different content is an error. Validate settings against the stored paid quote. Never accept a client report as proof of payment. Only a paired Flutter desktop printer host may report direct submission attempts. Mobile and web clients can monitor jobs and send authorized staff workflow commands, but they cannot obtain a printer-host document download grant.

## Realtime envelope

```json
{
  "schemaVersion": 1,
  "eventId": "uuid",
  "type": "shop.queue.changed",
  "shopId": "uuid",
  "jobId": "uuid",
  "aggregateVersion": 8,
  "occurredAt": "2026-10-02T11:00:00Z"
}
```

The server joins authenticated sessions to `shop:{shopId}`. Payloads omit phone numbers, file paths, credential material, and document bytes. On every connection, fetch the active queue through REST. An acknowledgement confirms receipt of a hint, not physical printing.

## Document processing errors

Stable error codes: FILE_TOO_LARGE, UNSUPPORTED_FORMAT, FORMAT_MISMATCH, PASSWORD_PROTECTED, CORRUPT_DOCUMENT, EMPTY_DOCUMENT, PAGE_LIMIT_EXCEEDED, CONVERSION_FAILED, PROCESSING_TIMEOUT, RESOURCE_LIMIT_EXCEEDED. Give the user a short actionable message. Keep parser traces restricted to operational logs without document content.

## Adapter ports

`PaymentGateway` separates create, verify callback, and query status. Its result distinguishes PENDING, SUCCEEDED, FAILED, CANCELLED, and UNKNOWN. Provider-specific idempotency behavior must be documented before enabling request retries.

`FileStore` exposes private writes/reads/deletion by opaque key. `DocumentProcessor` returns a prepared PDF reference and verified page count. `WhatsAppTransport` handles normalized incoming/outgoing messages. `PrinterBridge` lives in Dart and exposes capability discovery, submission, and optional status lookup. It is enabled only for paired Windows, macOS, and Ubuntu/Linux desktop hosts.
