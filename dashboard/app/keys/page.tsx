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
    <main className="mx-auto w-full max-w-3xl px-4 py-8 font-sans">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">API keys</h1>
        <p className="mt-1 text-sm text-zinc-600">
          A key lets one Claude connection read and write your job tracker. Use one key per device, and revoke any you no longer use.
        </p>
        <nav className="mt-2 flex gap-4 text-sm text-zinc-600">
          <Link href="/audit" className="underline">Audit log</Link>
          <Link href="/setup" className="underline">Setup guide</Link>
          <a href="/auth/logout" className="underline">Sign out</a>
        </nav>
      </header>

      <div className="mb-8">
        <KeyForm />
      </div>

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
    return <p className="text-sm text-zinc-500">No keys yet.</p>;
  }

  return (
    <ul className="divide-y divide-zinc-200 rounded border border-zinc-200 bg-white">
      {keys.map((key) => (
        <li key={key.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
          <div>
            <p className="font-medium text-zinc-900">{key.name}</p>
            <p className="text-xs text-zinc-500">
              created {key.created_at} · {key.policy_client}
            </p>
          </div>
          {key.revoked_at ? (
            <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">revoked</span>
          ) : (
            <form action={revokeKeyAction}>
              <input type="hidden" name="id" value={key.id} />
              <button type="submit" className="rounded border border-red-300 px-3 py-1 text-xs text-red-700">
                Revoke
              </button>
            </form>
          )}
        </li>
      ))}
    </ul>
  );
}
