import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { addApplication } from "../src/applications.js";
import { addContact, addNote, contactsFor } from "../src/records.js";
import { memoryDb } from "./helpers.js";

let db: Database.Database;
beforeEach(() => {
  db = memoryDb();
});
afterEach(() => db.close());

const appFor = (userId: string) =>
  addApplication(db, userId, { company: "Acme", role: "Engineer", date_applied: "2026-10-01", status: "applied" });

describe("notes", () => {
  it("attaches a note to the user's application", () => {
    const app = appFor("u1");
    const note = addNote(db, "u1", app.id, "Spoke with the hiring manager");
    expect(note).toMatchObject({ application_id: app.id, body: "Spoke with the hiring manager" });
  });

  it("refuses to attach a note to another user's application", () => {
    const app = appFor("u1");
    expect(() => addNote(db, "u2", app.id, "sneaky")).toThrow(/not found/);
    expect(db.prepare("SELECT COUNT(*) AS n FROM notes").get()).toEqual({ n: 0 });
  });
});

describe("contacts", () => {
  it("stores contacts in the order they were added", () => {
    const app = appFor("u1");
    addContact(db, "u1", app.id, { name: "Jordan Lee", role: "Recruiter", email: "jordan@example.com" });
    addContact(db, "u1", app.id, { name: "Sam Park" });
    expect(contactsFor(db, "u1", app.id).map((c) => c.name)).toEqual(["Jordan Lee", "Sam Park"]);
  });

  it("refuses to attach a contact to another user's application", () => {
    const app = appFor("u1");
    expect(() => addContact(db, "u2", app.id, { name: "Nobody" })).toThrow(/not found/);
    expect(contactsFor(db, "u2", app.id)).toEqual([]);
  });
});
