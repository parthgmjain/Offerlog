import type Database from "better-sqlite3";

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

/** Newest first. Optionally limited to one decision. */
export function listAuditRows(
  db: Database.Database,
  options: { decision?: Decision; limit?: number } = {},
): AuditRow[] {
  const where = options.decision ? "WHERE decision = ?" : "";
  const params: unknown[] = options.decision ? [options.decision] : [];
  return db
    .prepare(`SELECT * FROM audit_log ${where} ORDER BY id DESC LIMIT ?`)
    .all(...params, options.limit ?? 200) as AuditRow[];
}
