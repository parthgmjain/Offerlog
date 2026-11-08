import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { migrate, openDb } from "../../server/src/db.js";
import { writeAudit } from "../../server/src/audit.js";
import { listAuditRows } from "../lib/audit.js";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://localhost:5432/pipeline_test";

let db: Pool;
beforeEach(async () => {
  db = openDb(TEST_DATABASE_URL);
  await db.query("DROP TABLE IF EXISTS audit_log, contacts, notes, applications CASCADE");
  await migrate(db);
});
afterEach(() => db.end());

async function seed() {
  await writeAudit(db, { userId: "u1", clientId: "claude-desktop", tool: "add_application", args: { company: "Acme", email: "a@b.c" }, decision: "allowed", ruleId: "claude-desktop/write", after: { id: 1 } });
  await writeAudit(db, { userId: "u1", clientId: "read-only-demo", tool: "add_application", args: { company: "Globex" }, decision: "denied", ruleId: "read-only-demo/default-deny" });
  await writeAudit(db, { userId: "u1", clientId: "claude-desktop", tool: "list_applications", args: {}, decision: "allowed", ruleId: "claude-desktop/read" });
}

describe("listAuditRows", () => {
  it("returns newest first", async () => {
    await seed();
    expect((await listAuditRows(db)).map((r) => r.tool)).toEqual(["list_applications", "add_application", "add_application"]);
  });

  it("filters by decision", async () => {
    await seed();
    const denied = await listAuditRows(db, { decision: "denied" });
    expect(denied).toHaveLength(1);
    expect(denied[0]).toMatchObject({ client_id: "read-only-demo", rule_id: "read-only-demo/default-deny" });
  });

  it("respects the limit", async () => {
    await seed();
    expect(await listAuditRows(db, { limit: 2 })).toHaveLength(2);
  });

  it("returns redacted arguments, never raw sensitive values", async () => {
    await seed();
    const write = (await listAuditRows(db)).find((r) => r.tool === "add_application" && r.decision === "allowed");
    expect(write?.arguments).toContain("[redacted]");
    expect(write?.arguments).not.toContain("a@b.c");
  });
});
