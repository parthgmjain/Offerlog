import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  addApplication,
  getApplication,
  listApplications,
  updateStatus,
} from "./applications.js";
import { guardedCall, type CallContext } from "./gate.js";
import { STATUSES } from "./status.js";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD");
const status = z.enum(STATUSES);

function text(value: unknown, isError = false) {
  return {
    isError,
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

/** Runs a guarded call and turns any failure into an MCP error result. */
function handle<T>(run: () => T) {
  try {
    return text(run());
  } catch (err) {
    return text({ error: err instanceof Error ? err.message : String(err) }, true);
  }
}

export function createServer(ctx: CallContext): McpServer {
  const server = new McpServer({ name: "pipeline", version: "0.1.0" });

  server.registerTool(
    "add_application",
    {
      description: "Log a new job application.",
      inputSchema: {
        company: z.string().min(1),
        role: z.string().min(1),
        link: z.string().url().optional(),
        date_applied: isoDate,
        resume_version: z.string().optional(),
        cover_letter_version: z.string().optional(),
        status: status.default("applied"),
      },
    },
    (args) =>
      handle(() =>
        guardedCall(ctx, "add_application", args, () => ({
          result: addApplication(ctx.db, ctx.userId, args),
        })),
      ),
  );

  server.registerTool(
    "update_status",
    {
      description:
        "Move an application forward (applied -> interviewing -> offer), or to rejected or withdrawn. No backward moves.",
      inputSchema: { id: z.number().int().positive(), status },
    },
    (args) =>
      handle(() =>
        guardedCall(ctx, "update_status", args, () => {
          const { before, after } = updateStatus(ctx.db, ctx.userId, args.id, args.status);
          return { result: after, before, after };
        }),
      ),
  );

  server.registerTool(
    "list_applications",
    {
      description: "List applications, optionally filtered by status, company, or date range.",
      inputSchema: {
        status: status.optional(),
        company: z.string().optional(),
        from: isoDate.optional(),
        to: isoDate.optional(),
      },
    },
    (args) =>
      handle(() =>
        guardedCall(ctx, "list_applications", args, () => ({
          result: listApplications(ctx.db, ctx.userId, args),
        })),
      ),
  );

  server.registerTool(
    "get_application",
    {
      description: "Get full details for one application by id.",
      inputSchema: { id: z.number().int().positive() },
    },
    (args) =>
      handle(() =>
        guardedCall(ctx, "get_application", args, () => ({
          result: getApplication(ctx.db, ctx.userId, args.id),
        })),
      ),
  );

  return server;
}
