import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth0 } from "@/lib/auth0";
import { listAuditRows, type AuditRow, type Decision } from "@/lib/audit";
import { getDashboardPool } from "@/lib/db";

function parseDecision(value: string | string[] | undefined): Decision | undefined {
  return value === "allowed" || value === "denied" ? value : undefined;
}

function pretty(json: string | null): string | null {
  if (json === null) return null;
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}

const filters: { label: string; value: Decision | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Allowed", value: "allowed" },
  { label: "Denied", value: "denied" },
];

export default function AuditPage({ searchParams }: PageProps<"/audit">) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 font-sans text-zinc-800 dark:text-zinc-200">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Pipeline</p>
        <h1 className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">Audit log</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Every tool call made against the job tracker, newest first. This page is read-only.
        </p>
        <nav className="mt-4 flex gap-5 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          <Link href="/keys" className="underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100">API keys</Link>
          <Link href="/setup" className="underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100">Setup guide</Link>
          <a href="/auth/logout" className="underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100">Sign out</a>
        </nav>
      </header>

      <Suspense fallback={<p className="text-sm text-zinc-500">Loading audit log…</p>}>
        <AuditList searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function AuditList({ searchParams }: { searchParams: Promise<{ decision?: string | string[] }> }) {
  const session = await auth0.getSession();
  if (!session) {
    redirect("/auth/login");
  }

  const decision = parseDecision((await searchParams).decision);

  const rows: AuditRow[] = await listAuditRows(getDashboardPool(), {
    userId: session.user.sub,
    decision,
  });

  return (
    <>
      <nav className="mb-4 flex gap-2" aria-label="Filter by decision">
        {filters.map((filter) => {
          const active = filter.value === decision;
          return (
            <Link
              key={filter.label}
              href={filter.value ? `/audit?decision=${filter.value}` : "/audit"}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-3.5 py-1 text-sm font-medium ${
                active
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No audit entries yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
            <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Time (UTC)</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Tool</th>
                <th className="px-4 py-3">Decision</th>
                <th className="px-4 py-3">Rule</th>
                <th className="px-4 py-3">Arguments</th>
                <th className="px-4 py-3">Changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 align-top text-zinc-800 dark:divide-zinc-800 dark:text-zinc-200">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">{row.ts}</td>
                  <td className="px-4 py-3">{row.client_id}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.tool}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        row.decision === "allowed"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                      }`}
                    >
                      {row.decision}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">{row.rule_id}</td>
                  <td className="px-4 py-3">
                    <pre className="max-w-xs whitespace-pre-wrap break-words text-xs text-zinc-700 dark:text-zinc-300">
                      {pretty(row.arguments)}
                    </pre>
                  </td>
                  <td className="px-4 py-3">
                    {row.before_state || row.after_state ? (
                      <div className="max-w-xs space-y-1 text-xs text-zinc-700 dark:text-zinc-300">
                        {row.before_state && (
                          <pre className="whitespace-pre-wrap break-words">
                            <span className="font-semibold">before: </span>
                            {pretty(row.before_state)}
                          </pre>
                        )}
                        {row.after_state && (
                          <pre className="whitespace-pre-wrap break-words">
                            <span className="font-semibold">after: </span>
                            {pretty(row.after_state)}
                          </pre>
                        )}
                      </div>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
