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
export function addNote(db: Db, userId: string, applicationId: number, body: string): Note {
  getApplication(db, userId, applicationId);
  const info = db
    .prepare(`INSERT INTO notes (user_id, application_id, body, created_at) VALUES (?, ?, ?, ?)`)
    .run(userId, applicationId, body, new Date().toISOString());
  return db.prepare(`SELECT * FROM notes WHERE id = ?`).get(Number(info.lastInsertRowid)) as Note;
}

export function addContact(
  db: Db,
  userId: string,
  applicationId: number,
  input: NewContact,
): Contact {
  getApplication(db, userId, applicationId);
  const info = db
    .prepare(
      `INSERT INTO contacts (user_id, application_id, name, role, email, phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      userId,
      applicationId,
      input.name,
      input.role ?? null,
      input.email ?? null,
      input.phone ?? null,
      new Date().toISOString(),
    );
  return db.prepare(`SELECT * FROM contacts WHERE id = ?`).get(Number(info.lastInsertRowid)) as Contact;
}

export function contactsFor(db: Db, userId: string, applicationId: number): Contact[] {
  return db
    .prepare(`SELECT * FROM contacts WHERE user_id = ? AND application_id = ? ORDER BY id ASC`)
    .all(userId, applicationId) as Contact[];
}
