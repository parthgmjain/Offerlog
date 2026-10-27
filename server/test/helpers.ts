import { openDb, type Db } from "../src/db.js";
import type { Policy } from "../src/policy.js";

export function memoryDb(): Db {
  return openDb(":memory:");
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
