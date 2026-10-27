import type { Db } from "./db.js";

/** Fields whose values are replaced before anything reaches the audit log. */
export const SENSITIVE_FIELDS = new Set(["email", "phone", "notes"]);

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value)) {
      out[key] = SENSITIVE_FIELDS.has(key) ? "[redacted]" : redact(inner);
    }
    return out;
  }
  return value;
}

export interface AuditEntry {
  userId: string;
  clientId: string;
  tool: string;
  args: unknown;
  decision: "allowed" | "denied";
  ruleId: string;
  before?: unknown;
  after?: unknown;
}

export function writeAudit(db: Db, entry: AuditEntry): void {
  db.prepare(
    `INSERT INTO audit_log
       (user_id, ts, client_id, tool, arguments, decision, rule_id, before_state, after_state)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    entry.userId,
    new Date().toISOString(),
    entry.clientId,
    entry.tool,
    JSON.stringify(redact(entry.args)),
    entry.decision,
    entry.ruleId,
    entry.before === undefined ? null : JSON.stringify(redact(entry.before)),
    entry.after === undefined ? null : JSON.stringify(redact(entry.after)),
  );
}
