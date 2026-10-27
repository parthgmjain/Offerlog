# CLAUDE.md: Job Application Tracker MCP Server

Context for Claude Code (and any AI assistant) working on this repo. Read this before writing code.

## What this project is

An MCP server that lets an AI agent manage a job search: logging applications, updating statuses, tracking follow-ups, and drafting follow-up messages. Every action runs under scoped, deny-by-default permissions and is recorded in an append-only audit log. A Next.js dashboard lets the human browse applications, review the audit log, manage policies, and do anything destructive (like deleting).

## Why it exists

1. **Real problem:** job hunting means tracking dozens of applications across sites, and it ends up scattered across notes and spreadsheets. An AI agent could manage it, but giving an agent full access to your data is risky. This project solves both.
2. **Resume gaps it closes:** MCP and agent tooling, scoped permissions, audit logging, TypeScript, Next.js, PostgreSQL, authentication (Auth0 / OAuth, MFA), CI/CD.

**Definition of done:** deployed with a public link, clean README with setup instructions and a demo GIF, passing tests in CI, and 5-10 real people using it with one tracked usage number (applications tracked, weekly users). That number goes on the resume.

## Ground rules

- **No work or lab systems.** Never connect this to UC Merced's Pinnacles HPC cluster, lab data, or any LLT Lab resource. Personal accounts and public data only.
- **AI output is a draft.** Read every diff before accepting it. Don't accept whole files blind. Run it. Test it.
- **Check external APIs against real docs.** Don't trust generated calls to the MCP SDK, Auth0, or any third-party API without checking current documentation. This is where generated code is most often wrong.
- **Tests are not optional.** Write tests alongside features. If a test fails, fix the code, not the test (unless the test is actually wrong, and say why).
- **Never commit secrets.** Keys go in `.env` (gitignored) locally and in GitHub Actions secrets in CI.
- **Small commits, clear messages.** One logical change per commit.
- **Log what matters, not personal data.** Redact sensitive fields in logs.

## Tools the server exposes

- `add_application`: company, role, link, date applied, resume/cover letter version, status
- `update_status`: applied → interviewing → offer / rejected / withdrawn
- `list_applications`: filter by status, date range, company
- `get_application`: full details for one application
- `add_note` / `add_contact`: notes and recruiter/referral contacts on an application
- `upcoming_followups`: applications with no response after N days
- `draft_followup`: returns a draft message; **never sends anything**

## Permission model (the core engineering)

- Each agent/client has a **policy** listing which tools it may call.
- **Deny by default.** A tool not in the policy is denied.
- **Agents can add and update, never delete.** Deletion is human-only through the dashboard.
- **Read-only policy** available for agents that should only view data.
- **Nothing leaves the system.** No tool sends emails, submits applications, or calls external services on the user's behalf. Drafts only.
- Every call is checked against the policy **before** it executes. Denied calls are logged too.

## Audit log

Every tool call records:
- timestamp
- client/agent ID
- tool name
- arguments (sensitive fields redacted)
- decision (allowed / denied, and which policy rule decided it)
- what changed (before/after for updates)

The audit table is **append-only**. No update or delete path exists for it, including from the dashboard.

## Stack

- **Server:** TypeScript + official MCP TypeScript SDK
- **Database:** PostgreSQL (SQLite is fine for the first local version)
- **Dashboard:** Next.js + TypeScript + Tailwind
- **Auth:** Auth0 (free tier) or OAuth on the dashboard, MFA enabled
- **Testing:** unit tests for every tool; policy tests proving allowed calls succeed and disallowed calls are denied and logged
- **CI:** GitHub Actions runs the full test suite on every push

## Build phases

1. **Core server (weekend):** add/update/list/get tools, SQLite, working locally in Claude Desktop.
2. **Permissions + audit log:** policy engine, deny-by-default, append-only audit table, policy tests.
3. **Postgres + dashboard:** migrate to Postgres; Next.js dashboard for applications and the audit log.
4. **Auth:** Auth0 login + MFA on the dashboard.
5. **Polish + users:** README, demo GIF, share with other job-hunting students, track usage.

## Resume bullet target

> Built an MCP server that lets AI agents manage job applications under scoped, deny-by-default permissions with an append-only audit log of every tool call; TypeScript, PostgreSQL, Next.js dashboard with Auth0; used by N students to track M applications.