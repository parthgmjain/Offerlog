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

export function addApplication(db: Db, userId: string, input: NewApplication): Application {
  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO applications
         (user_id, company, role, link, date_applied, resume_version,
          cover_letter_version, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
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
    );
  return getApplication(db, userId, Number(info.lastInsertRowid));
}

export function getApplication(db: Db, userId: string, id: number): Application {
  const row = db
    .prepare(`SELECT * FROM applications WHERE id = ? AND user_id = ?`)
    .get(id, userId) as Application | undefined;
  if (!row) {
    throw new Error(`application ${id} not found`);
  }
  return row;
}

export function listApplications(
  db: Db,
  userId: string,
  filters: ApplicationFilters = {},
): Application[] {
  const clauses = ["user_id = ?"];
  const params: unknown[] = [userId];
  if (filters.status) {
    clauses.push("status = ?");
    params.push(filters.status);
  }
  if (filters.company) {
    clauses.push("company LIKE ?");
    params.push(`%${filters.company}%`);
  }
  if (filters.from) {
    clauses.push("date_applied >= ?");
    params.push(filters.from);
  }
  if (filters.to) {
    clauses.push("date_applied <= ?");
    params.push(filters.to);
  }
  return db
    .prepare(
      `SELECT * FROM applications WHERE ${clauses.join(" AND ")} ORDER BY date_applied DESC, id DESC`,
    )
    .all(...params) as Application[];
}

/** Applications still at `applied` whose application date is at least `days` before `today`. */
export function upcomingFollowups(
  db: Db,
  userId: string,
  today: string,
  days: number,
): Application[] {
  const cutoff = shiftDate(today, -days);
  return db
    .prepare(
      `SELECT * FROM applications
       WHERE user_id = ? AND status = 'applied' AND date_applied <= ?
       ORDER BY date_applied ASC, id ASC`,
    )
    .all(userId, cutoff) as Application[];
}

function shiftDate(date: string, days: number): string {
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

export function updateStatus(
  db: Db,
  userId: string,
  id: number,
  to: Status,
): { before: Application; after: Application } {
  const before = getApplication(db, userId, id);
  if (!canTransition(before.status, to)) {
    throw new Error(`cannot move application ${id} from ${before.status} to ${to}`);
  }
  db.prepare(
    `UPDATE applications SET status = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
  ).run(to, new Date().toISOString(), id, userId);
  return { before, after: getApplication(db, userId, id) };
}
