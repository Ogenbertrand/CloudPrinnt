import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createDatabaseConnection } from './index.js';

const migrationDirectory = fileURLToPath(new URL('../migrations/', import.meta.url));

export async function applyMigrations(databaseUrl: string): Promise<string[]> {
  const database = createDatabaseConnection(databaseUrl);
  try {
    const files = (await readdir(migrationDirectory))
      .filter((file) => /^\d+_.+\.sql$/.test(file))
      .sort();

    return await database.transaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(73128034)');
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          filename text PRIMARY KEY,
          applied_at timestamptz NOT NULL DEFAULT now()
        )
      `);

      const applied = await client.query<{ filename: string }>('SELECT filename FROM schema_migrations');
      const appliedNames = new Set(applied.rows.map((row) => row.filename));
      const executed: string[] = [];

      for (const filename of files) {
        if (appliedNames.has(filename)) continue;
        const sql = await readFile(new URL(`../migrations/${filename}`, import.meta.url), 'utf8');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
        executed.push(filename);
      }
      return executed;
    });
  } finally {
    await database.close();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required to run migrations.');
  const applied = await applyMigrations(databaseUrl);
  console.log(applied.length === 0 ? 'Database schema is up to date.' : `Applied: ${applied.join(', ')}`);
}
