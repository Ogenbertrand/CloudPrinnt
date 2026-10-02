/** Composition-root blueprint. A NestJS server will be wired here in the next phase. */
export const API_BLUEPRINT = {
  transport: ['HTTPS REST', 'Socket.IO'],
  modules: ['auth', 'shops', 'devices', 'jobs', 'documents', 'payments', 'realtime', 'audit'],
  status: 'scaffold-only',
} as const;
