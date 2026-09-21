import { env } from './env';
import { createMemDb, eq as memEq, asc as memAsc, desc as memDesc } from './memdb';
import * as schema from '../db/schema';

let db: ReturnType<typeof createMemDb>;
let eq: typeof memEq;
let asc: typeof memAsc;
let desc: typeof memDesc;

async function initDb() {
  // Try PostgreSQL first
  try {
    const { drizzle } = await import('drizzle-orm/node-postgres');
    const pg = await import('pg');

    const pool = new pg.Pool({
      connectionString: env.DATABASE_URL,
      max: 20,
      connectionTimeoutMillis: 3000,
    });

    // Test connection
    await pool.query('SELECT 1');

    const drizzleDb = drizzle(pool, { schema });

    // Import drizzle-orm helpers
    const drizzleOrm = await import('drizzle-orm');

    db = drizzleDb as any;
    eq = drizzleOrm.eq as any;
    asc = drizzleOrm.asc as any;
    desc = drizzleOrm.desc as any;

    console.log('✅ Connected to PostgreSQL');
    return;
  } catch (err) {
    console.log('⚠️  PostgreSQL not available, using in-memory database');
    console.log('   Start Docker with: docker compose up -d');
  }

  // Fallback to in-memory
  db = createMemDb();
  eq = memEq;
  asc = memAsc;
  desc = memDesc;
}

// Eager init
const initPromise = initDb();

export { db, eq, asc, desc, schema, initPromise };
