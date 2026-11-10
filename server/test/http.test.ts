import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { Db } from "../src/db.js";
import { createApiKey, revokeApiKey } from "../src/keys.js";
import { createHttpApp } from "../src/http.js";
import { freshDb, testPolicy } from "./helpers.js";

let db: Db;
let http: Server;
let base: string;

beforeEach(async () => {
  db = await freshDb();
  http = createHttpApp({ db, policy: testPolicy });
  await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", () => resolve()));
  const { port } = http.address() as AddressInfo;
  base = `http://127.0.0.1:${port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve) => http.close(() => resolve()));
  await db.end();
});

const initialize = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "test", version: "0.0.0" },
  },
};

function post(token: string | null, body: unknown) {
  return fetch(`${base}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("HTTP MCP endpoint", () => {
  it("refuses requests without an API key", async () => {
    const res = await post(null, initialize);
    expect(res.status).toBe(401);
  });

  it("refuses an unknown key", async () => {
    const res = await post("pl_made-up", initialize);
    expect(res.status).toBe(401);
  });

  it("accepts a valid key and starts a session", async () => {
    const { token } = await createApiKey(db, { userId: "u1", name: "k", policyClient: "writer" });
    const res = await post(token, initialize);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("pipeline");
  });

  it("refuses a key after it is revoked", async () => {
    const { token, record } = await createApiKey(db, { userId: "u1", name: "k", policyClient: "writer" });
    await revokeApiKey(db, "u1", record.id);
    const res = await post(token, initialize);
    expect(res.status).toBe(401);
  });

  it("returns 404 for other paths", async () => {
    const res = await fetch(`${base}/elsewhere`);
    expect(res.status).toBe(404);
  });
});
