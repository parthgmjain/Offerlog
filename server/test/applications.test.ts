import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db.js";
import {
  addApplication,
  getApplication,
  listApplications,
  updateStatus,
  upcomingFollowups,
} from "../src/applications.js";
import { freshDb } from "./helpers.js";

let db: Db;
beforeEach(async () => {
  db = await freshDb();
});
afterEach(() => db.end());

const base = {
  company: "Acme",
  role: "Engineer",
  date_applied: "2026-10-01",
  status: "applied" as const,
};

describe("applications", () => {
  it("adds and fetches an application with optional fields defaulted to null", async () => {
    const app = await addApplication(db, "u1", base);
    expect(app).toMatchObject({ company: "Acme", role: "Engineer", status: "applied", link: null });
    expect((await getApplication(db, "u1", app.id)).id).toBe(app.id);
  });

  it("filters list results by status, company, and date range", async () => {
    await addApplication(db, "u1", base);
    await addApplication(db, "u1", { ...base, company: "Globex", date_applied: "2026-09-01", status: "rejected" });
    await addApplication(db, "u1", { ...base, company: "Acme Labs", date_applied: "2026-10-20" });

    expect((await listApplications(db, "u1", { status: "rejected" })).map((a) => a.company)).toEqual(["Globex"]);
    expect(await listApplications(db, "u1", { company: "acme" })).toHaveLength(2);
    expect((await listApplications(db, "u1", { from: "2026-10-05" })).map((a) => a.company)).toEqual(["Acme Labs"]);
  });

  it("moves status forward and returns before and after", async () => {
    const app = await addApplication(db, "u1", base);
    const { before, after } = await updateStatus(db, "u1", app.id, "interviewing");
    expect(before.status).toBe("applied");
    expect(after.status).toBe("interviewing");
  });

  it("rejects a backward move and leaves the row unchanged", async () => {
    const app = await addApplication(db, "u1", { ...base, status: "interviewing" });
    await expect(updateStatus(db, "u1", app.id, "applied")).rejects.toThrow(/cannot move/);
    expect((await getApplication(db, "u1", app.id)).status).toBe("interviewing");
  });

  it("throws for a missing application", async () => {
    await expect(getApplication(db, "u1", 999)).rejects.toThrow(/not found/);
  });

  it("keeps users' data separate", async () => {
    const app = await addApplication(db, "u1", base);
    expect(await listApplications(db, "u2")).toEqual([]);
    await expect(getApplication(db, "u2", app.id)).rejects.toThrow(/not found/);
    await expect(updateStatus(db, "u2", app.id, "rejected")).rejects.toThrow(/not found/);
  });

  describe("upcomingFollowups", () => {
    it("returns applied applications at least N days old, including exactly N", async () => {
      await addApplication(db, "u1", { ...base, company: "Old", date_applied: "2026-10-01" });
      await addApplication(db, "u1", { ...base, company: "Edge", date_applied: "2026-10-08" });
      await addApplication(db, "u1", { ...base, company: "Recent", date_applied: "2026-10-09" });

      const due = await upcomingFollowups(db, "u1", "2026-10-15", 7);
      expect(due.map((a) => a.company)).toEqual(["Old", "Edge"]);
    });

    it("excludes applications that already moved past applied", async () => {
      const app = await addApplication(db, "u1", { ...base, company: "Replied", date_applied: "2026-10-01" });
      await updateStatus(db, "u1", app.id, "interviewing");
      expect(await upcomingFollowups(db, "u1", "2026-10-15", 7)).toEqual([]);
    });

    it("counts days across a month boundary", async () => {
      await addApplication(db, "u1", { ...base, company: "Late Oct", date_applied: "2026-10-27" });
      expect((await upcomingFollowups(db, "u1", "2026-11-03", 7)).map((a) => a.company)).toEqual(["Late Oct"]);
      expect(await upcomingFollowups(db, "u1", "2026-11-02", 7)).toEqual([]);
    });

    it("keeps users' data separate", async () => {
      await addApplication(db, "u1", { ...base, date_applied: "2026-10-01" });
      expect(await upcomingFollowups(db, "u2", "2026-10-15", 7)).toEqual([]);
    });
  });
});
