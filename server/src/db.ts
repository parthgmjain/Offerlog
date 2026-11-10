import pg from "pg";

export type Db = pg.Pool;

export function openDb(connectionString: string): Db {
  return new pg.Pool({ connectionString });
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    link TEXT,
    date_applied TEXT NOT NULL,
    resume_version TEXT,
    cover_letter_version TEXT,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    application_id INTEGER NOT NULL REFERENCES applications(id),
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    application_id INTEGER NOT NULL REFERENCES applications(id),
    name TEXT NOT NULL,
    role TEXT,
    email TEXT,
    phone TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    policy_client TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    revoked_at TEXT
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    ts TEXT NOT NULL,
    client_id TEXT NOT NULL,
    tool TEXT NOT NULL,
    arguments TEXT NOT NULL,
    decision TEXT NOT NULL CHECK (decision IN ('allowed', 'denied')),
    rule_id TEXT NOT NULL,
    before_state TEXT,
    after_state TEXT
  );

  CREATE OR REPLACE FUNCTION audit_log_append_only() RETURNS trigger
  LANGUAGE plpgsql AS $$
  BEGIN
    RAISE EXCEPTION 'audit_log is append-only';
  END;
  $$;

  DROP TRIGGER IF EXISTS audit_log_no_change ON audit_log;
  CREATE TRIGGER audit_log_no_change
    BEFORE UPDATE OR DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION audit_log_append_only();

  DROP TRIGGER IF EXISTS audit_log_no_truncate ON audit_log;
  CREATE TRIGGER audit_log_no_truncate
    BEFORE TRUNCATE ON audit_log
    FOR EACH STATEMENT EXECUTE FUNCTION audit_log_append_only();
`;

export async function migrate(db: Db): Promise<void> {
  await db.query(SCHEMA);
}
