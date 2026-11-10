import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Db } from "../src/db.js";
import { createServer } from "../src/server.js";
import { freshDb, testPolicy } from "./helpers.js";

let db: Db;
beforeEach(async () => {
  db = await freshDb();
});
afterEach(() => db.end());

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
  it("lists all nine tools", async () => {
    const { client, close } = await connect("writer");
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "add_application",
      "add_contact",
      "add_note",
      "draft_followup",
      "get_application",
      "list_applications",
      "upcoming_followups",
      "update_application",
      "update_status",
    ]);
    await close();
  });

  it("lets a writer correct an application and records before and after", async () => {
    const { client, close } = await connect("writer");
    await client.callTool({
      name: "add_application",
      arguments: { company: "Acme", role: "Engineer", date_applied: "2026-10-01" },
    });
    const fixed = await client.callTool({
      name: "update_application",
      arguments: { id: 1, company: "Acme Corp", resume_version: "v2" },
    });
    expect(fixed.isError).toBeFalsy();
    expect(textOf(fixed)).toContain('"company": "Acme Corp"');
    expect(textOf(fixed)).toContain('"role": "Engineer"');
    const log = await db.query<{ before_state: string; after_state: string }>(
      "SELECT before_state, after_state FROM audit_log WHERE tool = 'update_application'",
    );
    expect(log.rows.map((r) => [JSON.parse(r.before_state).company, JSON.parse(r.after_state).company])).toEqual([
      ["Acme", "Acme Corp"],
    ]);
    await close();
  });

  it("refuses update_application with no fields and does not change the row", async () => {
    const { client, close } = await connect("writer");
    await client.callTool({
      name: "add_application",
      arguments: { company: "Acme", role: "Engineer", date_applied: "2026-10-01" },
    });
    const empty = await client.callTool({ name: "update_application", arguments: { id: 1 } });
    expect(empty.isError).toBe(true);
    const cleared = await client.callTool({ name: "update_application", arguments: { id: 1, role: null } });
    expect(cleared.isError).toBe(true);
    const { rows } = await db.query("SELECT role FROM applications WHERE id = 1");
    expect(rows).toEqual([{ role: "Engineer" }]);
    await close();
  });

  it("returns notes and contacts with an application", async () => {
    const { client, close } = await connect("writer");
    await client.callTool({
      name: "add_application",
      arguments: { company: "Acme", role: "Engineer", date_applied: "2026-10-01" },
    });
    await db.query(
      "INSERT INTO notes (user_id, application_id, body, created_at) VALUES ('u1', 1, 'Phone screen Tuesday', '2026-10-02')",
    );
    await db.query(
      "INSERT INTO contacts (user_id, application_id, name, created_at) VALUES ('u1', 1, 'Dana', '2026-10-02')",
    );
    const detail = await client.callTool({ name: "get_application", arguments: { id: 1 } });
    expect(textOf(detail)).toContain("Phone screen Tuesday");
    expect(textOf(detail)).toContain('"name": "Dana"');
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
    const log = await db.query("SELECT decision, rule_id FROM audit_log");
    expect(log.rows).toEqual([{ decision: "denied", rule_id: "reader/default-deny" }]);
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
