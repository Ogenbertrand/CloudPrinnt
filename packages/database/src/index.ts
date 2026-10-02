/** Migration blueprint only; no database connection or migrations are implemented. */
export const PLANNED_TABLES = [
  'print_shops', 'staff_users', 'shop_memberships', 'shop_devices',
  'documents', 'print_jobs', 'payment_attempts', 'refunds',
  'device_reservations', 'print_attempts', 'inbound_events',
  'outbound_messages', 'outbox_events', 'audit_events',
  'conversation_sessions', 'command_results',
] as const;
