import type { Db } from "./db.js";
import { writeAudit } from "./audit.js";
import { decide, type Policy } from "./policy.js";

export interface CallContext {
  db: Db;
  policy: Policy;
  clientId: string;
  userId: string;
}

export class PolicyDeniedError extends Error {
  constructor(tool: string, clientId: string) {
    super(`policy denies ${clientId} from calling ${tool}`);
    this.name = "PolicyDeniedError";
  }
}

export interface ActionResult<T> {
  result: T;
  before?: unknown;
  after?: unknown;
}

/**
 * Every tool call goes through here. The policy is checked before the action
 * runs. Denied calls and allowed calls are both written to the audit log.
 */
export function guardedCall<T>(
  ctx: CallContext,
  tool: string,
  args: unknown,
  action: () => ActionResult<T>,
): T {
  const decision = decide(ctx.policy, ctx.clientId, tool);
  const base = {
    userId: ctx.userId,
    clientId: ctx.clientId,
    tool,
    args,
    ruleId: decision.ruleId,
  };

  if (!decision.allowed) {
    writeAudit(ctx.db, { ...base, decision: "denied" });
    throw new PolicyDeniedError(tool, ctx.clientId);
  }

  try {
    const { result, before, after } = action();
    writeAudit(ctx.db, { ...base, decision: "allowed", before, after });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    writeAudit(ctx.db, { ...base, decision: "allowed", after: { error: message } });
    throw err;
  }
}
