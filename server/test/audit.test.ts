import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db.js";
import { redact, writeAudit } from "../src/audit.js";
import { guardedCall, PolicyDeniedError } from "../src/gate.js";
import { addApplication } from "../src/applications.js";
import { freshDb, testPolicy } from "./helpers.js";

let db: Db;
beforeEach(async () => {
  db = await freshDb();
});
afterEach(() => db.end());

type AuditRow = {
  client_id: string;
  tool: string;
  decision: string;
  rule_id: string;
  arguments: string;
  before_state: string | null;
  after_state: string | null;
};

const rows = async () =>
  (await db.query<AuditRow>("SELECT * FROM audit_log ORDER BY id")).rows;

describe("audit log", () => {
  it("is append-only: UPDATE, DELETE, and TRUNCATE are rejected", async () => {
    await writeAudit(db, { userId: "u1", clientId: "c", tool: "t", args: {}, decision: "allowed", ruleId: "c/r" });
    await expect(db.query("UPDATE audit_log SET tool = 'x'")).rejects.toThrow(/append-only/);
    await expect(db.query("DELETE FROM audit_log")).rejects.toThrow(/append-only/);
    await expect(db.query("TRUNCATE audit_log")).rejects.toThrow(/append-only/);
    expect(await rows()).toHaveLength(1);
  });

  it("redacts sensitive fields in arguments and state", () => {
    expect(redact({ company: "Acme", email: "a@b.c", name: "Jordan Lee", nested: { phone: "555", notes: "hi" } })).toEqual({
      company: "Acme",
      email: "[redacted]",
      name: "[redacted]",
      nested: { phone: "[redacted]", notes: "[redacted]" },
    });
  });

  it("records a denied call with its rule and does not run the action", async () => {
    let ran = false;
    await expect(
      guardedCall({ db, policy: testPolicy, clientId: "reader", userId: "u1" }, "add_application", { company: "X" }, async () => {
        ran = true;
        return { result: null };
      }),
    ).rejects.toThrow(PolicyDeniedError);
    expect(ran).toBe(false);
    expect(await rows()).toMatchObject([
      { client_id: "reader", tool: "add_application", decision: "denied", rule_id: "reader/default-deny" },
    ]);
  });

  it("records an allowed write with before and after state, redacting sensitive fields", async () => {
    const ctx = { db, policy: testPolicy, clientId: "writer", userId: "u1" };
    await guardedCall(ctx, "add_application", { company: "Acme", email: "recruiter@acme.test" }, async () => {
      const app = await addApplication(db, "u1", { company: "Acme", role: "Eng", date_applied: "2026-10-01", status: "applied" });
      return { result: app, after: { company: app.company, email: "recruiter@acme.test" } };
    });
    const [row] = await rows();
    expect(row).toMatchObject({ decision: "allowed", rule_id: "writer/write" });
    expect(row.arguments).toContain("[redacted]");
    expect(row.arguments).not.toContain("recruiter@acme.test");
    expect(row.after_state).not.toContain("recruiter@acme.test");
  });

  it("logs an allowed call that fails, with the error", async () => {
    const ctx = { db, policy: testPolicy, clientId: "writer", userId: "u1" };
    await expect(
      guardedCall(ctx, "update_status", { id: 1, status: "offer" }, async () => {
        throw new Error("application 1 not found");
      }),
    ).rejects.toThrow(/not found/);
    expect((await rows())[0]).toMatchObject({
      decision: "allowed",
      after_state: JSON.stringify({ error: "application 1 not found" }),
    });
  });
});
