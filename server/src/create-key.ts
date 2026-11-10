import { migrate, openDb } from "./db.js";
import { createApiKey } from "./keys.js";

/**
 * Usage: npm run key:create -- <auth0-user-id> <key-name> [policy-client]
 * Prints the token once. Only its hash is stored, so it can't be shown again.
 */
const [userId, name, policyClient = "claude-desktop"] = process.argv.slice(2);
if (!userId || !name) {
  console.error("usage: npm run key:create -- <user-id> <key-name> [policy-client]");
  process.exit(1);
}

const db = openDb(process.env.DATABASE_URL ?? "postgres://localhost:5432/pipeline");
await migrate(db);
const { token, record } = await createApiKey(db, { userId, name, policyClient });
await db.end();

console.log(`created key ${record.id} "${record.name}" for ${record.user_id} (policy: ${record.policy_client})`);
console.log(`token (shown once): ${token}`);
