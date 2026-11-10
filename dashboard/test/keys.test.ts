import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { migrate, openDb } from "../../server/src/db.js";
import { resolveApiKey } from "../../server/src/keys.js";
import { createKey, listKeys, revokeKey } from "../lib/keys.js";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://localhost:5432/pipeline_test";

let db: Pool;
beforeEach(async () => {
  db = openDb(TEST_DATABASE_URL);
  await db.query("DROP TABLE IF EXISTS audit_log, contacts, notes, api_keys, applications CASCADE");
  await migrate(db);
});
afterEach(() => db.end());

describe("dashboard API keys", () => {
  it("a key made in the dashboard resolves on the server", async () => {
    const { token } = await createKey(db, { userId: "auth0|alice", name: "laptop" });
    expect(await resolveApiKey(db, token)).toEqual({ userId: "auth0|alice", policyClient: "claude-desktop" });
  });

  it("a revoked key stops resolving", async () => {
    const { token, row } = await createKey(db, { userId: "auth0|alice", name: "laptop" });
    expect(await revokeKey(db, "auth0|alice", row.id)).toBe(true);
    expect(await resolveApiKey(db, token)).toBeNull();
  });

  it("users can't revoke or list each other's keys", async () => {
    const { row } = await createKey(db, { userId: "auth0|alice", name: "laptop" });
    expect(await revokeKey(db, "auth0|mallory", row.id)).toBe(false);
    expect(await listKeys(db, "auth0|mallory")).toEqual([]);
    expect((await listKeys(db, "auth0|alice")).map((k) => k.name)).toEqual(["laptop"]);
  });

  it("list never includes the token or its hash", async () => {
    await createKey(db, { userId: "auth0|alice", name: "laptop" });
    expect(JSON.stringify(await listKeys(db, "auth0|alice"))).not.toMatch(/pl_|key_hash/);
  });
});
