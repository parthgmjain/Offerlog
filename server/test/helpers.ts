import { migrate, openDb, type Db } from "../src/db.js";
import type { Policy } from "../src/policy.js";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://localhost:5432/pipeline_test";

/** Gives each test an empty schema: drops the tables, then migrates again. */
export async function freshDb(): Promise<Db> {
  const db = openDb(TEST_DATABASE_URL);
  await db.query("DROP TABLE IF EXISTS audit_log, contacts, notes, applications CASCADE");
  await migrate(db);
  return db;
}

export const testPolicy: Policy = {
  clients: {
    writer: {
      rules: [
        { id: "read", tools: ["list_applications", "get_application"] },
        { id: "write", tools: ["add_application", "update_status"] },
      ],
    },
    reader: {
      rules: [{ id: "read", tools: ["list_applications", "get_application"] }],
    },
  },
};
