import type { Pool } from "pg";

export type Decision = "allowed" | "denied";

export interface AuditRow {
  id: number;
  ts: string;
  user_id: string;
  client_id: string;
  tool: string;
  arguments: string;
  decision: Decision;
  rule_id: string;
  before_state: string | null;
  after_state: string | null;
}

/**
 * Newest first, only rows owned by `userId`. Rows from other users are never
 * returned, so a logged-in user can't see anyone else's activity.
 */
export async function listAuditRows(
  pool: Pool,
  options: { userId: string; decision?: Decision; limit?: number },
): Promise<AuditRow[]> {
  const params: unknown[] = [options.userId];
  let where = "WHERE user_id = $1";
  if (options.decision) {
    params.push(options.decision);
    where += ` AND decision = $${params.length}`;
  }
  params.push(options.limit ?? 200);
  const { rows } = await pool.query<AuditRow>(
    `SELECT * FROM audit_log ${where} ORDER BY id DESC LIMIT $${params.length}`,
    params,
  );
  return rows;
}
