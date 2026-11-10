import { createServer as createHttpServer, type IncomingMessage, type Server } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Db } from "./db.js";
import { resolveApiKey } from "./keys.js";
import type { Policy } from "./policy.js";
import { createServer } from "./server.js";

export interface HttpOptions {
  db: Db;
  policy: Policy;
}

const MAX_BODY_BYTES = 1_000_000;

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      resolve(text ? JSON.parse(text) : undefined);
    });
    req.on("error", reject);
  });
}

/**
 * Serves MCP over HTTP at /mcp. Every request must carry `Authorization: Bearer <key>`.
 * The key decides whose data the call touches and which policy applies.
 * Stateless: each request gets its own server, so no session is shared between users.
 */
export function createHttpApp({ db, policy }: HttpOptions): Server {
  return createHttpServer(async (req, res) => {
    if (req.url !== "/mcp") {
      res.writeHead(404).end("not found");
      return;
    }

    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
    const key = token ? await resolveApiKey(db, token) : null;
    if (!key) {
      res.writeHead(401, { "WWW-Authenticate": "Bearer" }).end("invalid or missing API key");
      return;
    }

    const server = createServer({
      db,
      policy,
      clientId: key.policyClient,
      userId: key.userId,
    });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      const body = req.method === "POST" ? await readBody(req) : undefined;
      await transport.handleRequest(req, res, body);
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(400).end(err instanceof Error ? err.message : "bad request");
      }
    }
  });
}
