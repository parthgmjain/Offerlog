import Database from "better-sqlite3";

export type Db = Database.Database;

export function openDb(path: string): Db {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  migrate(db);
  return db;
}

function migrate(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      application_id INTEGER NOT NULL REFERENCES applications(id),
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      application_id INTEGER NOT NULL REFERENCES applications(id),
      name TEXT NOT NULL,
      role TEXT,
      email TEXT,
      phone TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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

    CREATE TRIGGER IF NOT EXISTS audit_log_no_update
    BEFORE UPDATE ON audit_log
    BEGIN
      SELECT RAISE(ABORT, 'audit_log is append-only');
    END;

    CREATE TRIGGER IF NOT EXISTS audit_log_no_delete
    BEFORE DELETE ON audit_log
    BEGIN
      SELECT RAISE(ABORT, 'audit_log is append-only');
    END;
  `);
}
