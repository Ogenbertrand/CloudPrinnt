export interface RuntimeConfig {
  readonly environment: 'development' | 'test' | 'production';
  readonly isProduction: boolean;
  readonly port: number;
  readonly host: string;
  readonly databaseUrl: string;
  readonly corsOrigins: readonly string[];
}

function parsePort(value: string | undefined): number {
  const candidate = value ?? '3000';
  if (!/^\d+$/.test(candidate)) throw new Error('API_PORT must be an integer.');
  const port = Number(candidate);
  if (port < 1 || port > 65_535) throw new Error('API_PORT must be between 1 and 65535.');
  return port;
}

function parseDatabaseUrl(value: string | undefined): string {
  if (!value) throw new Error('DATABASE_URL is required.');
  const parsed = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('DATABASE_URL must use postgres:// or postgresql://.');
  }
  return value;
}

export function parseRuntimeConfig(env: Readonly<Record<string, string | undefined>>): RuntimeConfig {
  const environment = env.NODE_ENV ?? 'development';
  if (environment !== 'development' && environment !== 'test' && environment !== 'production') {
    throw new Error('NODE_ENV must be development, test, or production.');
  }
  const corsOrigins = (env.CORS_ORIGINS ?? '')
    .split(',').map((origin) => origin.trim()).filter((origin) => origin.length > 0);
  for (const origin of corsOrigins) {
    const parsed = new URL(origin);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('CORS_ORIGINS entries must be HTTP(S) URLs.');
  }
  return {
    environment,
    isProduction: environment === 'production',
    port: parsePort(env.API_PORT),
    host: env.API_HOST ?? '127.0.0.1',
    databaseUrl: parseDatabaseUrl(env.DATABASE_URL),
    corsOrigins,
  };
}
