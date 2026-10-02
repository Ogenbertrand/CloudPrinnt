/** Vendor adapters belong here; no live integration is enabled by this blueprint. */
export * from './documents/document-admission.service.js';
export * from './storage/local-private-file-store.js';

export const INTEGRATION_BOUNDARIES = [
  'whatsapp/baileys', 'payments/provider-adapter', 'storage/private-filesystem',
  'documents/pdf-validator', 'documents/docx-converter', 'queues/bullmq',
] as const;
