import type { Db } from "./db.js";
import { canTransition, type Status } from "./status.js";

export interface Application {
  id: number;
  user_id: string;
  company: string;
  role: string;
  link: string | null;
  date_applied: string;
  resume_version: string | null;
  cover_letter_version: string | null;
  status: Status;
  created_at: string;
  updated_at: string;
}

export interface NewApplication {
  company: string;
  role: string;
  link?: string;
  date_applied: string;
  resume_version?: string;
  cover_letter_version?: string;
  status: Status;
}

export interface ApplicationFilters {
  status?: Status;
  company?: string;
  from?: string;
  to?: string;
}

export async function addApplication(
  db: Db,
  userId: string,
  input: NewApplication,
): Promise<Application> {
  const now = new Date().toISOString();
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO applications
       (user_id, company, role, link, date_applied, resume_version,
        cover_letter_version, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      userId,
      input.company,
      input.role,
      input.link ?? null,
      input.date_applied,
      input.resume_version ?? null,
      input.cover_letter_version ?? null,
      input.status,
      now,
      now,
    ],
  );
  return getApplication(db, userId, rows[0].id);
}

export async function getApplication(db: Db, userId: string, id: number): Promise<Application> {
  const { rows } = await db.query<Application>(
    `SELECT * FROM applications WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
  if (rows.length === 0) {
    throw new Error(`application ${id} not found`);
  }
  return rows[0];
}

export async function listApplications(
  db: Db,
  userId: string,
  filters: ApplicationFilters = {},
): Promise<Application[]> {
  const clauses = ["user_id = $1"];
  const params: unknown[] = [userId];
  if (filters.status) {
    params.push(filters.status);
    clauses.push(`status = $${params.length}`);
  }
  if (filters.company) {
    params.push(`%${filters.company}%`);
    clauses.push(`company ILIKE $${params.length}`);
  }
  if (filters.from) {
    params.push(filters.from);
    clauses.push(`date_applied >= $${params.length}`);
  }
  if (filters.to) {
    params.push(filters.to);
    clauses.push(`date_applied <= $${params.length}`);
  }
  const { rows } = await db.query<Application>(
    `SELECT * FROM applications WHERE ${clauses.join(" AND ")} ORDER BY date_applied DESC, id DESC`,
    params,
  );
  return rows;
}

/** Applications still at `applied` whose application date is at least `days` before `today`. */
export async function upcomingFollowups(
  db: Db,
  userId: string,
  today: string,
  days: number,
): Promise<Application[]> {
  const { rows } = await db.query<Application>(
    `SELECT * FROM applications
     WHERE user_id = $1 AND status = 'applied' AND date_applied <= $2
     ORDER BY date_applied ASC, id ASC`,
    [userId, shiftDate(today, -days)],
  );
  return rows;
}

function shiftDate(date: string, days: number): string {
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

/** Fields a user can correct. Status has its own tool, because it follows transition rules. */
export interface ApplicationPatch {
  company?: string;
  role?: string;
  link?: string | null;
  date_applied?: string;
  resume_version?: string | null;
  cover_letter_version?: string | null;
}

const EDITABLE_FIELDS = [
  "company",
  "role",
  "link",
  "date_applied",
  "resume_version",
  "cover_letter_version",
] as const;
const REQUIRED_FIELDS: readonly string[] = ["company", "role", "date_applied"];

export async function updateApplication(
  db: Db,
  userId: string,
  id: number,
  patch: ApplicationPatch,
): Promise<{ before: Application; after: Application }> {
  const before = await getApplication(db, userId, id);
  const fields = EDITABLE_FIELDS.filter((field) => patch[field] !== undefined);
  if (fields.length === 0) {
    throw new Error("nothing to update: give at least one field to change");
  }
  for (const field of fields) {
    if (REQUIRED_FIELDS.includes(field) && patch[field] === null) {
      throw new Error(`${field} cannot be cleared`);
    }
  }

  const values: unknown[] = fields.map((field) => patch[field] ?? null);
  const assignments = fields.map((field, i) => `${field} = $${i + 1}`);
  values.push(new Date().toISOString(), id, userId);
  const n = fields.length;
  await db.query(
    `UPDATE applications SET ${assignments.join(", ")}, updated_at = $${n + 1}
     WHERE id = $${n + 2} AND user_id = $${n + 3}`,
    values,
  );
  return { before, after: await getApplication(db, userId, id) };
}

export async function updateStatus(
  db: Db,
  userId: string,
  id: number,
  to: Status,
): Promise<{ before: Application; after: Application }> {
  const before = await getApplication(db, userId, id);
  if (!canTransition(before.status, to)) {
    throw new Error(`cannot move application ${id} from ${before.status} to ${to}`);
  }
  await db.query(
    `UPDATE applications SET status = $1, updated_at = $2 WHERE id = $3 AND user_id = $4`,
    [to, new Date().toISOString(), id, userId],
  );
  return { before, after: await getApplication(db, userId, id) };
}
