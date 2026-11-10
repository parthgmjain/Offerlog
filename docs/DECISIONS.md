# Decisions

Decisions for the MVP (phases 1–2 of [CLAUDE.md](../CLAUDE.md)). Each entry says what was chosen and why. Change an entry here when a decision changes.

## MVP scope

**In:** local MCP server over stdio (works in Claude Desktop) with `add_application`, `update_status`, `list_applications`, `get_application`. Deny-by-default policy file. Append-only audit log of every call (allowed and denied). SQLite. Tests for each tool and for the policy.

**Out (later):** dashboard, auth/MFA, deployment, multi-user login, `draft_followup`, `upcoming_followups`, `add_note`/`add_contact`, retention rules, API keys.

## Decisions

| # | Area | Decision |
|---|------|----------|
| 1 | Database | Postgres 16. Installed with Homebrew locally, hosted provider when deployed. Replaces the SQLite MVP. |
| 2 | Auth provider | Auth0 free tier (up to 25,000 monthly active users). Development tenant created. |
| 3 | MFA | Skipped for now, against CLAUDE.md. MFA needs a paid Auth0 plan, which waits until launch is paid. Must be enabled before any user other than the owner logs in. |
| 4 | Transport | stdio for MVP. HTTP at deploy time. |
| 5 | Policy format | JSON file. Per client: named rules, each listing allowed tools. Moves to DB only if the dashboard edits policies. |
| 6 | Client identity | Named client ID set in the MCP server config (`PIPELINE_CLIENT_ID`). API keys at deploy time. |
| 7 | Hosting | None yet. Later: one small host for server and dashboard. |
| 8 | Repo layout | One repo. `server/` now, `dashboard/` later. |
| 9 | Tooling | TypeScript, npm, Vitest, `pg` with plain SQL. No ORM. |
| 10 | Dashboard | Next.js App Router, later. Shared types live in the server package. |
| 11 | Status model | Order: `applied` → `interviewing` → `offer`. Any non-terminal status may move to `rejected` or `withdrawn`. `rejected` and `withdrawn` are terminal. No backward moves. |
| 12 | Follow-up rule | Default 7 days after `applied` with no status change. Configurable parameter. (Tool is post-MVP.) |
| 13 | `draft_followup` | Templates, not an LLM. (Tool is post-MVP.) |
| 14 | Resume/cover letter | Plain text version label (e.g. `resume v3`). No file storage. |
| 15 | Contacts | Separate table with a foreign key to the application. (Post-MVP.) |
| 16 | Sensitive fields | Redacted in audit arguments: `email`, `phone`, `notes`, `name`. Note and contact text is passed only in redacted fields, and results are never written to the audit log. Extend the list as fields are added. |
| 17 | Rule identity | Each rule has an ID, recorded as `<client>/<rule>` in every audit row. |
| 18 | Denied calls | Return a clear error to the agent and log the denial. No rate limiting yet. |
| 19 | Append-only | Enforced by SQL triggers that reject `UPDATE` and `DELETE` on `audit_log`, plus no code path that writes them. |
| 20 | Retention | Keep everything. |
| 21 | Data isolation | `user_id` column on every data table from day one. MVP has one user. |
| 22 | Onboarding | Invite-only, handled manually. No sign-up flow. |
| 23 | Usage metric | Weekly active users (distinct users who added an application) and total applications tracked. A query, not a separate system. |
| 24 | Deletion | Hard delete for applications, with audit entries kept. No delete tool in MVP; dashboard delete comes later. |
| 25 | Phase order | Phases 1 and 2 together. The policy check is the point of the project. |
