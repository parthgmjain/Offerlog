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
export async function guardedCall<T>(
  ctx: CallContext,
  tool: string,
  args: unknown,
  action: () => Promise<ActionResult<T>>,
): Promise<T> {
  const decision = decide(ctx.policy, ctx.clientId, tool);
  const base = {
    userId: ctx.userId,
    clientId: ctx.clientId,
    tool,
    args,
    ruleId: decision.ruleId,
  };

  if (!decision.allowed) {
    await writeAudit(ctx.db, { ...base, decision: "denied" });
    throw new PolicyDeniedError(tool, ctx.clientId);
  }

  let outcome: ActionResult<T>;
  try {
    outcome = await action();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await writeAudit(ctx.db, { ...base, decision: "allowed", after: { error: message } });
    throw err;
  }
  await writeAudit(ctx.db, {
    ...base,
    decision: "allowed",
    before: outcome.before,
    after: outcome.after,
  });
  return outcome.result;
}
