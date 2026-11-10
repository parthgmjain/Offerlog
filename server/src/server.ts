import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  addApplication,
  getApplication,
  listApplications,
  updateApplication,
  updateStatus,
  upcomingFollowups,
} from "./applications.js";
import { guardedCall, type CallContext } from "./gate.js";
import { draftFollowup } from "./followup.js";
import { addContact, addNote, applicationDetail, contactsFor } from "./records.js";
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
async function handle<T>(run: () => Promise<T>) {
  try {
    return text(await run());
  } catch (err) {
    return text({ error: err instanceof Error ? err.message : String(err) }, true);
  }
}

export function createServer(ctx: CallContext): McpServer {
  const server = new McpServer(
    { name: "pipeline", version: "0.1.0" },
    {
      instructions:
        "If a call fails with a timeout or connection error, the server may be waking up from sleep. Wait about a minute, then retry the same call once.",
    },
  );

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
        guardedCall(ctx, "add_application", args, async () => ({
          result: await addApplication(ctx.db, ctx.userId, args),
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
        guardedCall(ctx, "update_status", args, async () => {
          const { before, after } = await updateStatus(ctx.db, ctx.userId, args.id, args.status);
          return { result: after, before, after };
        }),
      ),
  );

  server.registerTool(
    "update_application",
    {
      description:
        "Correct the details of an application: company, role, link, dates, or resume and cover letter versions. Pass only the fields to change. To change status, use update_status.",
      inputSchema: {
        id: z.number().int().positive(),
        company: z.string().min(1).optional(),
        role: z.string().min(1).optional(),
        link: z.string().url().nullable().optional(),
        date_applied: isoDate.optional(),
        resume_version: z.string().nullable().optional(),
        cover_letter_version: z.string().nullable().optional(),
      },
    },
    (args) =>
      handle(() =>
        guardedCall(ctx, "update_application", args, async () => {
          const { id, ...patch } = args;
          const { before, after } = await updateApplication(ctx.db, ctx.userId, id, patch);
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
        guardedCall(ctx, "list_applications", args, async () => ({
          result: await listApplications(ctx.db, ctx.userId, args),
        })),
      ),
  );

  server.registerTool(
    "upcoming_followups",
    {
      description:
        "List applications still at 'applied' that are at least N days old, so you can follow up. Defaults to 7 days.",
      inputSchema: {
        days: z.number().int().min(1).max(365).default(7),
        today: isoDate.optional(),
      },
    },
    (args) =>
      handle(() =>
        guardedCall(ctx, "upcoming_followups", args, async () => ({
          result: await upcomingFollowups(
            ctx.db,
            ctx.userId,
            args.today ?? new Date().toISOString().slice(0, 10),
            args.days,
          ),
        })),
      ),
  );

  server.registerTool(
    "add_note",
    {
      description: "Attach a note to an application.",
      inputSchema: {
        id: z.number().int().positive(),
        notes: z.string().min(1).max(5000),
      },
    },
    (args) =>
      handle(() =>
        guardedCall(ctx, "add_note", args, async () => ({
          result: await addNote(ctx.db, ctx.userId, args.id, args.notes),
        })),
      ),
  );

  server.registerTool(
    "add_contact",
    {
      description: "Attach a recruiter or referral contact to an application.",
      inputSchema: {
        id: z.number().int().positive(),
        name: z.string().min(1),
        role: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
      },
    },
    (args) =>
      handle(() =>
        guardedCall(ctx, "add_contact", args, async () => ({
          result: await addContact(ctx.db, ctx.userId, args.id, {
            name: args.name,
            role: args.role,
            email: args.email,
            phone: args.phone,
          }),
        })),
      ),
  );

  server.registerTool(
    "draft_followup",
    {
      description:
        "Return a follow-up email draft for an application. Never sends anything; the user copies and sends it.",
      inputSchema: { id: z.number().int().positive() },
    },
    (args) =>
      handle(() =>
        guardedCall(ctx, "draft_followup", args, async () => {
          const app = await getApplication(ctx.db, ctx.userId, args.id);
          const contacts = await contactsFor(ctx.db, ctx.userId, args.id);
          return { result: draftFollowup(app, contacts) };
        }),
      ),
  );

  server.registerTool(
    "get_application",
    {
      description: "Get full details for one application by id, including its notes and contacts.",
      inputSchema: { id: z.number().int().positive() },
    },
    (args) =>
      handle(() =>
        guardedCall(ctx, "get_application", args, async () => ({
          result: await applicationDetail(ctx.db, ctx.userId, args.id),
        })),
      ),
  );

  return server;
}
