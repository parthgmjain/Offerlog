import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db.js";
import { createApiKey, listApiKeys, resolveApiKey, revokeApiKey } from "../src/keys.js";
import { freshDb } from "./helpers.js";

let db: Db;
beforeEach(async () => {
  db = await freshDb();
});
afterEach(() => db.end());

describe("API keys", () => {
  it("resolves a fresh key to its owner and policy client", async () => {
    const { token } = await createApiKey(db, { userId: "auth0|alice", name: "laptop", policyClient: "claude-desktop" });
    expect(token.startsWith("pl_")).toBe(true);
    expect(await resolveApiKey(db, token)).toEqual({ userId: "auth0|alice", policyClient: "claude-desktop" });
  });

  it("stores only a hash, never the token itself", async () => {
    const { token } = await createApiKey(db, { userId: "u1", name: "k", policyClient: "claude-desktop" });
    const stored = await db.query("SELECT key_hash FROM api_keys");
    expect(JSON.stringify(stored.rows)).not.toContain(token);
  });

  it("rejects unknown, malformed, and empty tokens", async () => {
    await createApiKey(db, { userId: "u1", name: "k", policyClient: "claude-desktop" });
    expect(await resolveApiKey(db, "pl_not-a-real-key")).toBeNull();
    expect(await resolveApiKey(db, "no-prefix")).toBeNull();
    expect(await resolveApiKey(db, "")).toBeNull();
  });

  it("stops working once revoked, and only its owner can revoke it", async () => {
    const { token, record } = await createApiKey(db, { userId: "u1", name: "k", policyClient: "claude-desktop" });
    expect(await revokeApiKey(db, "u2", record.id)).toBe(false);
    expect(await resolveApiKey(db, token)).not.toBeNull();

    expect(await revokeApiKey(db, "u1", record.id)).toBe(true);
    expect(await resolveApiKey(db, token)).toBeNull();
  });

  it("lists only the user's own keys, without secrets", async () => {
    await createApiKey(db, { userId: "u1", name: "mine", policyClient: "claude-desktop" });
    await createApiKey(db, { userId: "u2", name: "theirs", policyClient: "claude-desktop" });
    const mine = await listApiKeys(db, "u1");
    expect(mine.map((k) => k.name)).toEqual(["mine"]);
    expect(JSON.stringify(mine)).not.toContain("key_hash");
  });
});
