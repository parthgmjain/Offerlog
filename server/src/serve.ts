import { migrate, openDb } from "./db.js";
import { createHttpApp } from "./http.js";
import { loadPolicy } from "./policy.js";

const db = openDb(process.env.DATABASE_URL ?? "postgres://localhost:5432/pipeline");
// The hosted server runs with a limited database role, which can't create tables.
// Run migrations once with the owner role, then set SKIP_MIGRATE=true.
if (process.env.SKIP_MIGRATE !== "true") {
  await migrate(db);
}
const policy = loadPolicy(process.env.PIPELINE_POLICY ?? "config/policy.json");
const port = Number(process.env.PORT ?? 8787);

const http = createHttpApp({ db, policy });
http.listen(port, () => {
  console.error(`pipeline MCP listening on port ${port}`);
});
