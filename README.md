# Pipeline

![Scripted demo: tool calls, a denied call, and the redacted audit log](docs/demo.gif)

Pipeline is an MCP server that lets an AI agent help me manage my job search. The agent can log applications, update their status, and list the ones that need a follow-up. Every tool call goes through a policy check first, and every call is recorded in an audit log. The agent can't delete anything, and it can't send messages or contact anyone on my behalf.

## Why I built it

Tracking dozens of applications across job sites, notes, and spreadsheets gets messy fast. I wanted an assistant to do the bookkeeping, but I didn't want to give any agent unrestricted access to my data. So the server enforces what each client is allowed to do, and it keeps a record of what happened.

## What it can do

| Tool | What it does |
|------|--------------|
| `add_application` | Log a new application: company, role, link, date applied, resume and cover letter version, status |
| `update_status` | Move an application forward (applied → interviewing → offer), or to rejected or withdrawn. No backward moves. |
| `list_applications` | List applications, filtered by status, company, or date range |
| `get_application` | Show full details for one application |
| `upcoming_followups` | List applications still at `applied` that are at least N days old (default 7) |
| `add_note` | Attach a note to an application. The note text is redacted in the audit log. |
| `add_contact` | Attach a recruiter or referral contact. The name, email, and phone are redacted in the audit log. |
| `draft_followup` | Return a follow-up email draft from a fixed template. It never sends anything. |

## How permissions work

- Each client (for example, Claude Desktop) has a policy that lists the tools it may call.
- Anything not listed is denied. Denied calls are logged too.
- Agents can add and update, but they can't delete. Deletion is meant to be done by me, by hand.
- A read-only client can be set up by giving it only the read tools.

## Audit log

Every tool call writes one row to the `audit_log` table with:

- the timestamp and client ID
- the tool name and its arguments, with sensitive fields (`email`, `phone`, `notes`) redacted
- the decision (allowed or denied) and the rule that made it
- the before and after values for changes

The table is append-only. Postgres triggers reject any `UPDATE`, `DELETE`, or `TRUNCATE` on it.

## Setup

You need Node.js 20 or newer and npm.

1. Install the server's dependencies:

   ```bash
   cd server
   npm install
   ```

2. Start Postgres and create the databases. On macOS with Homebrew:

   ```bash
   brew install postgresql@16
   brew services start postgresql@16
   createdb pipeline
   createdb pipeline_test
   ```

   The server creates its tables the first time it starts. `pipeline_test` is used only by the tests.

3. Create the policy file from the example:

   ```bash
   cp config/policy.example.json config/policy.json
   ```

   `config/policy.json` is gitignored, so your local settings stay on your machine.

4. Run the tests to check the setup:

   ```bash
   npm test
   npm run typecheck
   ```

5. Connect Claude Desktop to the hosted server. This is the easiest way:

   1. Create an API key on your dashboard's **API keys** page. The key is shown once, so keep the page open.
   2. Fully quit Claude Desktop with Cmd+Q.
   3. From the repository root, run:

      ```bash
      ./scripts/connect-claude.sh
      ```

      The script asks for your key with the input hidden, saves a backup of your Claude Desktop config, and adds the `pipeline` entry. It needs Node.js, which you already have if you ran the steps above.

   4. Reopen Claude Desktop and start a new chat. The tools appear once it starts.

   To run the server on your own machine instead, use this entry in `~/Library/Application Support/Claude/claude_desktop_config.json`. Find the full path to `npx` with `which npx`, and replace the paths with your own:

   ```json
   {
     "mcpServers": {
       "pipeline": {
         "command": "/full/path/to/npx",
         "args": ["tsx", "/full/path/to/Pipeline/server/src/index.ts"],
         "env": {
           "PIPELINE_CLIENT_ID": "claude-desktop",
           "PIPELINE_POLICY": "/full/path/to/Pipeline/server/config/policy.json",
           "DATABASE_URL": "postgres://localhost:5432/pipeline"
         }
       }
     }
   }
   ```

6. Fully quit Claude Desktop with Cmd+Q, then reopen it. The tools appear once it starts. Claude Desktop only loads tools at startup, so a restart is needed after any change to the server's tools.

### Environment variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `PIPELINE_CLIENT_ID` | Yes | none | Which policy entry applies to this connection |
| `PIPELINE_POLICY` | No | `config/policy.json` | Path to the policy file |
| `DATABASE_URL` | No | `postgres://localhost:5432/pipeline` | Postgres connection string for the server |
| `PIPELINE_USER_ID` | No | `default` | Owner of the data. Rows from other user IDs are invisible. |

## Project layout

```
Pipeline/
├── CLAUDE.md                 Context for AI assistants working on this repo
├── docs/DECISIONS.md         The design decisions behind the MVP
└── server/
    ├── src/
    │   ├── index.ts          Entry point (stdio transport)
    │   ├── server.ts         MCP tool definitions
    │   ├── gate.ts           Policy check, then action, then audit
    │   ├── policy.ts         Deny-by-default policy engine
    │   ├── audit.ts          Append-only audit log and redaction
    │   ├── applications.ts   Application data access
    │   ├── status.ts         Status transition rules
    │   └── db.ts             Postgres connection and schema
    ├── test/                 Vitest tests for tools, policy, audit, and status
    └── config/policy.example.json
```

## Audit log dashboard

A read-only Next.js page that shows the audit log, newest first, with a filter for allowed or denied calls. It connects to the same Postgres database as the server, but as a role that can only read the audit log.

Create that role once, after the server has started at least once:

```bash
psql pipeline -c "CREATE ROLE pipeline_dashboard LOGIN PASSWORD 'choose-a-password';" -c "GRANT CONNECT ON DATABASE pipeline TO pipeline_dashboard;" -c "GRANT USAGE ON SCHEMA public TO pipeline_dashboard;" -c "GRANT SELECT ON audit_log TO pipeline_dashboard;"
```

Put the connection string in `dashboard/.env.local`, which is gitignored:

```
DASHBOARD_DATABASE_URL=postgres://pipeline_dashboard:choose-a-password@localhost:5432/pipeline
```

Then run it:

```bash
cd dashboard
npm install
npm run dev
```

Then open http://localhost:3000. The dashboard has no login yet, so run it only on your own machine and don't expose the port.

## Development

- `npm test` runs the test suite (in `server/` and in `dashboard/`).
- `npm run typecheck` checks types without building.
- `npm start` runs the server directly over stdio. It waits for MCP messages on stdin, so it's easiest to test through Claude Desktop or an MCP client.

Design decisions and their reasons are in [docs/DECISIONS.md](docs/DECISIONS.md).

## Status and roadmap

This is a working local version. It runs on Postgres on one machine.

Not built yet:

- Postgres, Auth0 login with MFA, and deployment to a public host
- A demo GIF
