/** Agreed baseline. Runtime environment validation will be added with the API. */
export const PRODUCT_LIMITS = {
  maxUploadBytes: 15_000_000,
  convenienceFeeXaf: 50,
  currency: 'XAF',
  displayTimeZone: 'Africa/Douala',
  acceptedFormats: ['PDF', 'DOCX'],
} as const;

export const QUEUE_NAMES = {
  documents: 'document.process',
  paymentReconciliation: 'payment.reconcile',
  whatsapp: 'whatsapp.send',
  shopNotifications: 'shop.notify',
  retention: 'retention.cleanup',
} as const;
