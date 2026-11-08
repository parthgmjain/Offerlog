import type { Db } from "./db.js";
import { getApplication } from "./applications.js";

export interface Note {
  id: number;
  user_id: string;
  application_id: number;
  body: string;
  created_at: string;
}

export interface Contact {
  id: number;
  user_id: string;
  application_id: number;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export interface NewContact {
  name: string;
  role?: string;
  email?: string;
  phone?: string;
}

/** Throws if the application does not exist or belongs to another user. */
export async function addNote(
  db: Db,
  userId: string,
  applicationId: number,
  body: string,
): Promise<Note> {
  await getApplication(db, userId, applicationId);
  const { rows } = await db.query<Note>(
    `INSERT INTO notes (user_id, application_id, body, created_at)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, applicationId, body, new Date().toISOString()],
  );
  return rows[0];
}

export async function addContact(
  db: Db,
  userId: string,
  applicationId: number,
  input: NewContact,
): Promise<Contact> {
  await getApplication(db, userId, applicationId);
  const { rows } = await db.query<Contact>(
    `INSERT INTO contacts (user_id, application_id, name, role, email, phone, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      userId,
      applicationId,
      input.name,
      input.role ?? null,
      input.email ?? null,
      input.phone ?? null,
      new Date().toISOString(),
    ],
  );
  return rows[0];
}

export async function contactsFor(db: Db, userId: string, applicationId: number): Promise<Contact[]> {
  const { rows } = await db.query<Contact>(
    `SELECT * FROM contacts WHERE user_id = $1 AND application_id = $2 ORDER BY id ASC`,
    [userId, applicationId],
  );
  return rows;
}
