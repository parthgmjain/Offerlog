import { Pool } from "pg";

let pool: Pool | undefined;

/**
 * Connects as a read-only Postgres role. The dashboard never writes, and the
 * database refuses writes from this role even if code tries to.
 */
export function getDashboardPool(): Pool {
  if (!process.env.DASHBOARD_DATABASE_URL) {
    throw new Error("DASHBOARD_DATABASE_URL is not set");
  }
  pool ??= new Pool({ connectionString: process.env.DASHBOARD_DATABASE_URL });
  return pool;
}
