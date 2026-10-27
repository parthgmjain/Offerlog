import { readFileSync } from "node:fs";
import { z } from "zod";

const policySchema = z.object({
  clients: z.record(
    z.string(),
    z.object({
      rules: z.array(
        z.object({
          id: z.string().min(1),
          tools: z.array(z.string().min(1)),
        }),
      ),
    }),
  ),
});

export type Policy = z.infer<typeof policySchema>;

export interface Decision {
  allowed: boolean;
  /** Recorded in the audit log: `<client>/<rule>`, or a default-deny marker. */
  ruleId: string;
}

export function loadPolicy(path: string): Policy {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  return policySchema.parse(raw);
}

/** Deny by default: a tool is allowed only if a rule for this client lists it. */
export function decide(policy: Policy, clientId: string, tool: string): Decision {
  const client = policy.clients[clientId];
  if (!client) {
    return { allowed: false, ruleId: "unknown-client" };
  }
  for (const rule of client.rules) {
    if (rule.tools.includes(tool)) {
      return { allowed: true, ruleId: `${clientId}/${rule.id}` };
    }
  }
  return { allowed: false, ruleId: `${clientId}/default-deny` };
}
