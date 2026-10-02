import { Pool, type PoolClient, type QueryResultRow } from 'pg';

/** The production table set. See migrations for the executable schema. */
export const PLANNED_TABLES = [
  'print_shops', 'staff_users', 'shop_memberships', 'shop_devices',
  'documents', 'print_jobs', 'payment_attempts', 'refunds',
  'device_reservations', 'print_attempts', 'inbound_events',
  'outbound_messages', 'outbox_events', 'audit_events',
  'conversation_sessions', 'command_results',
] as const;

export interface DatabaseConnection {
  readonly query: Pool['query'];
  close(): Promise<void>;
  ping(): Promise<void>;
  transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T>;
}

/**
 * PostgreSQL is the source of truth. Callers must use parameterized values;
 * table names and SQL fragments remain static in repository code.
 */
export function createDatabaseConnection(databaseUrl: string): DatabaseConnection {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  return {
    query: pool.query.bind(pool),
    async close() {
      await pool.end();
    },
    async ping() {
      await pool.query('SELECT 1');
    },
    async transaction<T>(work: (client: PoolClient) => Promise<T>) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await work(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

export type DatabaseRow = QueryResultRow;
