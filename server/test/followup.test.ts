import { describe, expect, it } from "vitest";
import type { Application } from "../src/applications.js";
import { draftFollowup } from "../src/followup.js";
import type { Contact } from "../src/records.js";

const app: Application = {
  id: 1,
  user_id: "u1",
  company: "Acme",
  role: "Software Engineer",
  link: null,
  date_applied: "2026-10-01",
  resume_version: null,
  cover_letter_version: null,
  status: "applied",
  created_at: "2026-10-01T00:00:00.000Z",
  updated_at: "2026-10-01T00:00:00.000Z",
};

const contact: Contact = {
  id: 1,
  user_id: "u1",
  application_id: 1,
  name: "Jordan Lee",
  role: null,
  email: null,
  phone: null,
  created_at: "2026-10-01T00:00:00.000Z",
};

describe("draftFollowup", () => {
  it("greets the first contact by first name", () => {
    const draft = draftFollowup(app, [contact]);
    expect(draft.body.startsWith("Hi Jordan,")).toBe(true);
  });

  it("falls back to a generic greeting without a contact", () => {
    expect(draftFollowup(app, []).body.startsWith("Hello,")).toBe(true);
  });

  it("names the role, company, and application date", () => {
    const draft = draftFollowup(app, []);
    expect(draft.subject).toBe("Following up on my Software Engineer application at Acme");
    expect(draft.body).toContain("Software Engineer role at Acme on 2026-10-01");
  });
});
