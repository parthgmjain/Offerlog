import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { openDb } from "../../server/src/db.js";
import { writeAudit } from "../../server/src/audit.js";
import { listAuditRows } from "../lib/audit.js";

let db: Database.Database;
beforeEach(() => {
  db = openDb(":memory:");
});
afterEach(() => db.close());

function seed() {
  writeAudit(db, { userId: "u1", clientId: "claude-desktop", tool: "add_application", args: { company: "Acme", email: "a@b.c" }, decision: "allowed", ruleId: "claude-desktop/write", after: { id: 1 } });
  writeAudit(db, { userId: "u1", clientId: "read-only-demo", tool: "add_application", args: { company: "Globex" }, decision: "denied", ruleId: "read-only-demo/default-deny" });
  writeAudit(db, { userId: "u1", clientId: "claude-desktop", tool: "list_applications", args: {}, decision: "allowed", ruleId: "claude-desktop/read" });
}

describe("listAuditRows", () => {
  it("returns newest first", () => {
    seed();
    expect(listAuditRows(db).map((r) => r.tool)).toEqual(["list_applications", "add_application", "add_application"]);
  });

  it("filters by decision", () => {
    seed();
    const denied = listAuditRows(db, { decision: "denied" });
    expect(denied).toHaveLength(1);
    expect(denied[0]).toMatchObject({ client_id: "read-only-demo", rule_id: "read-only-demo/default-deny" });
  });

  it("respects the limit", () => {
    seed();
    expect(listAuditRows(db, { limit: 2 })).toHaveLength(2);
  });

  it("returns redacted arguments, never raw sensitive values", () => {
    seed();
    const write = listAuditRows(db).find((r) => r.tool === "add_application" && r.decision === "allowed");
    expect(write?.arguments).toContain("[redacted]");
    expect(write?.arguments).not.toContain("a@b.c");
  });
});
