import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db.js";
import { redact, writeAudit } from "../src/audit.js";
import { guardedCall, PolicyDeniedError } from "../src/gate.js";
import { addApplication } from "../src/applications.js";
import { memoryDb, testPolicy } from "./helpers.js";

let db: Db;
beforeEach(() => {
  db = memoryDb();
});
afterEach(() => db.close());

type AuditRow = {
  client_id: string;
  tool: string;
  decision: string;
  rule_id: string;
  arguments: string;
  before_state: string | null;
  after_state: string | null;
};

const rows = () => db.prepare("SELECT * FROM audit_log ORDER BY id").all() as AuditRow[];

describe("audit log", () => {
  it("is append-only: UPDATE and DELETE are rejected", () => {
    writeAudit(db, { userId: "u1", clientId: "c", tool: "t", args: {}, decision: "allowed", ruleId: "c/r" });
    expect(() => db.prepare("UPDATE audit_log SET tool = 'x'").run()).toThrow(/append-only/);
    expect(() => db.prepare("DELETE FROM audit_log").run()).toThrow(/append-only/);
    expect(rows()).toHaveLength(1);
  });

  it("redacts sensitive fields in arguments and state", () => {
    expect(redact({ company: "Acme", email: "a@b.c", nested: { phone: "555", notes: "hi" } })).toEqual({
      company: "Acme",
      email: "[redacted]",
      nested: { phone: "[redacted]", notes: "[redacted]" },
    });
  });

  it("records a denied call with its rule and does not run the action", () => {
    let ran = false;
    expect(() =>
      guardedCall({ db, policy: testPolicy, clientId: "reader", userId: "u1" }, "add_application", { company: "X" }, () => {
        ran = true;
        return { result: null };
      }),
    ).toThrow(PolicyDeniedError);
    expect(ran).toBe(false);
    expect(rows()).toMatchObject([{ client_id: "reader", tool: "add_application", decision: "denied", rule_id: "reader/default-deny" }]);
  });

  it("records an allowed write with before and after state, redacting sensitive fields", () => {
    const ctx = { db, policy: testPolicy, clientId: "writer", userId: "u1" };
    guardedCall(ctx, "add_application", { company: "Acme", email: "recruiter@acme.test" }, () => {
      const app = addApplication(db, "u1", { company: "Acme", role: "Eng", date_applied: "2026-10-01", status: "applied" });
      return { result: app, after: { company: app.company, email: "recruiter@acme.test" } };
    });
    const [row] = rows();
    expect(row).toMatchObject({ decision: "allowed", rule_id: "writer/write" });
    expect(row.arguments).toContain("[redacted]");
    expect(row.arguments).not.toContain("recruiter@acme.test");
    expect(row.after_state).not.toContain("recruiter@acme.test");
  });

  it("logs an allowed call that fails, with the error", () => {
    const ctx = { db, policy: testPolicy, clientId: "writer", userId: "u1" };
    expect(() =>
      guardedCall(ctx, "update_status", { id: 1, status: "offer" }, () => {
        throw new Error("application 1 not found");
      }),
    ).toThrow(/not found/);
    expect(rows()[0]).toMatchObject({ decision: "allowed", after_state: JSON.stringify({ error: "application 1 not found" }) });
  });
});
