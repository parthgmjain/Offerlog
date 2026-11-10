"use client";

import { useActionState } from "react";
import { createKeyAction, type CreateKeyState } from "./actions";

const initial: CreateKeyState = {};

export function KeyForm() {
  const [state, action, pending] = useActionState(createKeyAction, initial);

  return (
    <div className="space-y-4">
      <form action={action} className="flex gap-2">
        <input
          name="name"
          placeholder="e.g. my laptop"
          maxLength={60}
          required
          className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          Create key
        </button>
      </form>

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}

      {state.token && (
        <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm">
          <p className="font-semibold text-amber-900">Copy this key now. It won&apos;t be shown again.</p>
          <code className="mt-2 block break-all font-mono text-xs">{state.token}</code>
        </div>
      )}
    </div>
  );
}
