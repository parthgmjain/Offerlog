import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db.js";
import {
  addApplication,
  getApplication,
  listApplications,
  updateStatus,
} from "../src/applications.js";
import { memoryDb } from "./helpers.js";

let db: Db;
beforeEach(() => {
  db = memoryDb();
});
afterEach(() => db.close());

const base = {
  company: "Acme",
  role: "Engineer",
  date_applied: "2026-10-01",
  status: "applied" as const,
};

describe("applications", () => {
  it("adds and fetches an application with optional fields defaulted to null", () => {
    const app = addApplication(db, "u1", base);
    expect(app).toMatchObject({ company: "Acme", role: "Engineer", status: "applied", link: null });
    expect(getApplication(db, "u1", app.id).id).toBe(app.id);
  });

  it("filters list results by status, company, and date range", () => {
    addApplication(db, "u1", base);
    addApplication(db, "u1", { ...base, company: "Globex", date_applied: "2026-09-01", status: "rejected" });
    addApplication(db, "u1", { ...base, company: "Acme Labs", date_applied: "2026-10-20" });

    expect(listApplications(db, "u1", { status: "rejected" }).map((a) => a.company)).toEqual(["Globex"]);
    expect(listApplications(db, "u1", { company: "acme" })).toHaveLength(2);
    expect(listApplications(db, "u1", { from: "2026-10-05" }).map((a) => a.company)).toEqual(["Acme Labs"]);
  });

  it("moves status forward and returns before and after", () => {
    const app = addApplication(db, "u1", base);
    const { before, after } = updateStatus(db, "u1", app.id, "interviewing");
    expect(before.status).toBe("applied");
    expect(after.status).toBe("interviewing");
  });

  it("rejects a backward move and leaves the row unchanged", () => {
    const app = addApplication(db, "u1", { ...base, status: "interviewing" });
    expect(() => updateStatus(db, "u1", app.id, "applied")).toThrow(/cannot move/);
    expect(getApplication(db, "u1", app.id).status).toBe("interviewing");
  });

  it("throws for a missing application", () => {
    expect(() => getApplication(db, "u1", 999)).toThrow(/not found/);
  });

  it("keeps users' data separate", () => {
    const app = addApplication(db, "u1", base);
    expect(listApplications(db, "u2")).toEqual([]);
    expect(() => getApplication(db, "u2", app.id)).toThrow(/not found/);
    expect(() => updateStatus(db, "u2", app.id, "rejected")).toThrow(/not found/);
  });
});
