import Database from "better-sqlite3";
import { resolve } from "node:path";

/**
 * Opens the pipeline database read-only. The dashboard never writes to it,
 * and SQLite enforces that even if code tries to.
 */
export function openReadOnlyDb(): Database.Database {
  const path = process.env.PIPELINE_DB ?? resolve(process.cwd(), "../server/data/pipeline.db");
  return new Database(path, { readonly: true, fileMustExist: true });
}
