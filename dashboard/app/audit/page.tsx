import Link from "next/link";
import { Suspense } from "react";
import { listAuditRows, type AuditRow, type Decision } from "@/lib/audit";
import { openReadOnlyDb } from "@/lib/db";

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
    <main className="mx-auto w-full max-w-6xl px-4 py-8 font-sans">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Audit log</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Every tool call made against the job tracker, newest first. This page is read-only.
        </p>
      </header>

      <Suspense fallback={<p className="text-sm text-zinc-500">Loading audit log…</p>}>
        <AuditList searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function AuditList({ searchParams }: { searchParams: Promise<{ decision?: string | string[] }> }) {
  const decision = parseDecision((await searchParams).decision);

  const db = openReadOnlyDb();
  let rows: AuditRow[];
  try {
    rows = listAuditRows(db, { decision });
  } finally {
    db.close();
  }

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
              className={`rounded-full px-3 py-1 text-sm ${
                active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
          No audit entries yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2">Time (UTC)</th>
                <th className="px-3 py-2">Client</th>
                <th className="px-3 py-2">Tool</th>
                <th className="px-3 py-2">Decision</th>
                <th className="px-3 py-2">Rule</th>
                <th className="px-3 py-2">Arguments</th>
                <th className="px-3 py-2">Changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white align-top">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-600">{row.ts}</td>
                  <td className="px-3 py-2">{row.client_id}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.tool}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        row.decision === "allowed"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {row.decision}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-zinc-600">{row.rule_id}</td>
                  <td className="px-3 py-2">
                    <pre className="max-w-xs whitespace-pre-wrap break-words text-xs text-zinc-700">
                      {pretty(row.arguments)}
                    </pre>
                  </td>
                  <td className="px-3 py-2">
                    {row.before_state || row.after_state ? (
                      <div className="max-w-xs space-y-1 text-xs text-zinc-700">
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
