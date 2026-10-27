import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Db } from "../src/db.js";
import { createServer } from "../src/server.js";
import { memoryDb, testPolicy } from "./helpers.js";

let db: Db;
beforeEach(() => {
  db = memoryDb();
});
afterEach(() => db.close());

async function connect(clientId: string) {
  const server = createServer({ db, policy: testPolicy, clientId, userId: "u1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(clientTransport);
  return { client, close: () => client.close() };
}

function textOf(result: unknown): string {
  return (result as { content: { text: string }[] }).content[0].text;
}

describe("MCP server end to end", () => {
  it("lists all four tools", async () => {
    const { client, close } = await connect("writer");
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(
      ["add_application", "get_application", "list_applications", "update_status"],
    );
    await close();
  });

  it("lets a writer add and update an application", async () => {
    const { client, close } = await connect("writer");
    const added = await client.callTool({
      name: "add_application",
      arguments: { company: "Acme", role: "Engineer", date_applied: "2026-10-01" },
    });
    expect(added.isError).toBeFalsy();
    const updated = await client.callTool({ name: "update_status", arguments: { id: 1, status: "interviewing" } });
    expect(textOf(updated)).toContain('"status": "interviewing"');
    await close();
  });

  it("refuses a reader's write and records the denial", async () => {
    const { client, close } = await connect("reader");
    const denied = await client.callTool({
      name: "add_application",
      arguments: { company: "Acme", role: "Engineer", date_applied: "2026-10-01" },
    });
    expect(denied.isError).toBe(true);
    expect(textOf(denied)).toContain("policy denies reader");
    const log = db.prepare("SELECT decision, rule_id FROM audit_log").all();
    expect(log).toEqual([{ decision: "denied", rule_id: "reader/default-deny" }]);
    await close();
  });

  it("rejects invalid input before it reaches the database", async () => {
    const { client, close } = await connect("writer");
    const bad = await client.callTool({
      name: "add_application",
      arguments: { company: "Acme", role: "Engineer", date_applied: "October 1" },
    });
    expect(bad.isError).toBe(true);
    await close();
  });
});
