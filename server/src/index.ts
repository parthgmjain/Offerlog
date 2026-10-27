import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { openDb } from "./db.js";
import { loadPolicy } from "./policy.js";
import { createServer } from "./server.js";

const clientId = process.env.PIPELINE_CLIENT_ID;
if (!clientId) {
  console.error("PIPELINE_CLIENT_ID is required (e.g. claude-desktop).");
  process.exit(1);
}

const db = openDb(process.env.PIPELINE_DB ?? "data/pipeline.db");
const policy = loadPolicy(process.env.PIPELINE_POLICY ?? "config/policy.json");
const userId = process.env.PIPELINE_USER_ID ?? "default";

const server = createServer({ db, policy, clientId, userId });
await server.connect(new StdioServerTransport());
