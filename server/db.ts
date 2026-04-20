/**
 * Database Connection Module
 *
 * This module sets up the database connection using Drizzle ORM with PostgreSQL.
 * Exports null when DATABASE_URL is not set, allowing the server to boot
 * without a database (pack/inventory routes are conditionally mounted).
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

let pool: Pool | null = null;
let drizzleDb: ReturnType<typeof drizzle> | null = null;

if (databaseUrl) {
  console.log(`Database connection initialized with URL: ${databaseUrl.replace(/:[^:]*@/, ':***@')}`);
  pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
  });
  drizzleDb = drizzle(pool);
} else {
  console.log('DATABASE_URL not set — database features disabled');
}

export const db = drizzleDb;
export const directDb = pool;
export default db;