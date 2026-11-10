import { createHash, randomBytes } from "node:crypto";
import type { Db } from "./db.js";

export interface ApiKeyRecord {
  id: number;
  user_id: string;
  name: string;
  policy_client: string;
  created_at: string;
  revoked_at: string | null;
}

export interface ResolvedKey {
  userId: string;
  policyClient: string;
}

const PREFIX = "pl_";

/** Only the hash is stored. The token itself is shown to the user once, at creation. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createApiKey(
  db: Db,
  input: { userId: string; name: string; policyClient: string },
): Promise<{ token: string; record: ApiKeyRecord }> {
  const token = PREFIX + randomBytes(32).toString("base64url");
  const { rows } = await db.query<ApiKeyRecord>(
    `INSERT INTO api_keys (user_id, name, policy_client, key_hash, created_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, name, policy_client, created_at, revoked_at`,
    [input.userId, input.name, input.policyClient, hashToken(token), new Date().toISOString()],
  );
  return { token, record: rows[0] };
}

/** Returns the owner for a valid, unrevoked token, or null for anything else. */
export async function resolveApiKey(db: Db, token: string): Promise<ResolvedKey | null> {
  if (!token.startsWith(PREFIX)) {
    return null;
  }
  const { rows } = await db.query<{ user_id: string; policy_client: string }>(
    `SELECT user_id, policy_client FROM api_keys WHERE key_hash = $1 AND revoked_at IS NULL`,
    [hashToken(token)],
  );
  if (rows.length === 0) {
    return null;
  }
  return { userId: rows[0].user_id, policyClient: rows[0].policy_client };
}

export async function listApiKeys(db: Db, userId: string): Promise<ApiKeyRecord[]> {
  const { rows } = await db.query<ApiKeyRecord>(
    `SELECT id, user_id, name, policy_client, created_at, revoked_at
     FROM api_keys WHERE user_id = $1 ORDER BY id DESC`,
    [userId],
  );
  return rows;
}

/** Only the key's owner can revoke it. Returns false if no active key matched. */
export async function revokeApiKey(db: Db, userId: string, id: number): Promise<boolean> {
  const result = await db.query(
    `UPDATE api_keys SET revoked_at = $1
     WHERE id = $2 AND user_id = $3 AND revoked_at IS NULL`,
    [new Date().toISOString(), id, userId],
  );
  return (result.rowCount ?? 0) > 0;
}
