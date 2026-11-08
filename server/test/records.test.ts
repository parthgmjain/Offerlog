import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db.js";
import { addApplication } from "../src/applications.js";
import { addContact, addNote, contactsFor } from "../src/records.js";
import { freshDb } from "./helpers.js";

let db: Db;
beforeEach(async () => {
  db = await freshDb();
});
afterEach(() => db.end());

const appFor = (userId: string) =>
  addApplication(db, userId, { company: "Acme", role: "Engineer", date_applied: "2026-10-01", status: "applied" });

describe("notes", () => {
  it("attaches a note to the user's application", async () => {
    const app = await appFor("u1");
    const note = await addNote(db, "u1", app.id, "Spoke with the hiring manager");
    expect(note).toMatchObject({ application_id: app.id, body: "Spoke with the hiring manager" });
  });

  it("refuses to attach a note to another user's application", async () => {
    const app = await appFor("u1");
    await expect(addNote(db, "u2", app.id, "sneaky")).rejects.toThrow(/not found/);
    expect((await db.query("SELECT COUNT(*)::int AS n FROM notes")).rows).toEqual([{ n: 0 }]);
  });
});

describe("contacts", () => {
  it("stores contacts in the order they were added", async () => {
    const app = await appFor("u1");
    await addContact(db, "u1", app.id, { name: "Jordan Lee", role: "Recruiter", email: "jordan@example.com" });
    await addContact(db, "u1", app.id, { name: "Sam Park" });
    expect((await contactsFor(db, "u1", app.id)).map((c) => c.name)).toEqual(["Jordan Lee", "Sam Park"]);
  });

  it("refuses to attach a contact to another user's application", async () => {
    const app = await appFor("u1");
    await expect(addContact(db, "u2", app.id, { name: "Nobody" })).rejects.toThrow(/not found/);
    expect(await contactsFor(db, "u2", app.id)).toEqual([]);
  });
});
