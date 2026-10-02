/** One process owns a Baileys session. Domain actions run through the application layer. */
export const WHATSAPP_GATEWAY_BLUEPRINT = {
  inbound: ['deduplicate', 'persist-message', 'stream-upload', 'route-conversation'],
  outbound: ['consume-message-task', 'send', 'record-delivery'],
  menuFallback: 'numbered-text',
  status: 'scaffold-only',
} as const;
