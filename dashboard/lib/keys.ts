import { createHash, randomBytes } from "node:crypto";
import type { Pool } from "pg";

export interface ApiKeyRow {
  id: number;
  name: string;
  policy_client: string;
  created_at: string;
  revoked_at: string | null;
}

const PREFIX = "pl_";

/** Must match the server's hashing, or keys created here won't resolve there. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Creates a key for `userId`. The token is returned once; only its hash is stored. */
export async function createKey(
  pool: Pool,
  input: { userId: string; name: string; policyClient?: string },
): Promise<{ token: string; row: ApiKeyRow }> {
  const token = PREFIX + randomBytes(32).toString("base64url");
  const { rows } = await pool.query<ApiKeyRow>(
    `INSERT INTO api_keys (user_id, name, policy_client, key_hash, created_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, policy_client, created_at, revoked_at`,
    [input.userId, input.name, input.policyClient ?? "claude-desktop", hashToken(token), new Date().toISOString()],
  );
  return { token, row: rows[0] };
}

export async function listKeys(pool: Pool, userId: string): Promise<ApiKeyRow[]> {
  const { rows } = await pool.query<ApiKeyRow>(
    `SELECT id, name, policy_client, created_at, revoked_at
     FROM api_keys WHERE user_id = $1 ORDER BY id DESC`,
    [userId],
  );
  return rows;
}

/** Only the owner can revoke. Returns false if no active key matched. */
export async function revokeKey(pool: Pool, userId: string, id: number): Promise<boolean> {
  const result = await pool.query(
    `UPDATE api_keys SET revoked_at = $1
     WHERE id = $2 AND user_id = $3 AND revoked_at IS NULL`,
    [new Date().toISOString(), id, userId],
  );
  return (result.rowCount ?? 0) > 0;
}
