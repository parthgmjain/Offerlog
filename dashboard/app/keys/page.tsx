import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth0 } from "@/lib/auth0";
import { listKeys, type ApiKeyRow } from "@/lib/keys";
import { getDashboardPool } from "@/lib/db";
import { KeyForm } from "./key-form";
import { revokeKeyAction } from "./actions";

export default function KeysPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 font-sans text-zinc-800 dark:text-zinc-200">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Pipeline</p>
        <h1 className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">API keys</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          A key lets one Claude connection read and write your job tracker. Use one key per device, and revoke any you no
          longer use.
        </p>
        <nav className="mt-4 flex gap-5 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          <Link href="/audit" className="underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100">Audit log</Link>
          <Link href="/setup" className="underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100">Setup guide</Link>
          <a href="/auth/logout" className="underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100">Sign out</a>
        </nav>
      </header>

      <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">Create a key</h2>
        <KeyForm />
      </div>

      <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">Your keys</h2>
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading keys…</p>}>
        <KeyList />
      </Suspense>
    </main>
  );
}

async function KeyList() {
  const session = await auth0.getSession();
  if (!session) {
    redirect("/auth/login");
  }

  const keys: ApiKeyRow[] = await listKeys(getDashboardPool(), session.user.sub);
  if (keys.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 p-5 text-sm text-zinc-500 dark:border-zinc-700">
        No keys yet. Create one above to connect Claude Desktop.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
      {keys.map((key) => (
        <li key={key.id} className="flex items-center justify-between gap-4 px-5 py-4 text-sm">
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">{key.name}</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              created {key.created_at} · {key.policy_client}
            </p>
          </div>
          {key.revoked_at ? (
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              revoked
            </span>
          ) : (
            <form action={revokeKeyAction}>
              <input type="hidden" name="id" value={key.id} />
              <button
                type="submit"
                className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
              >
                Revoke
              </button>
            </form>
          )}
        </li>
      ))}
    </ul>
  );
}
