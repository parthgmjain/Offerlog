"use client";

import { useActionState, useState } from "react";
import { createKeyAction, type CreateKeyState } from "./actions";

const initial: CreateKeyState = {};
const MCP_URL = "https://offerlog.onrender.com/mcp";

/** The entry Claude Desktop needs. The key goes in as a header, so it is never a command-line argument. */
function claudeConfig(token: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        pipeline: {
          command: "npx",
          args: ["-y", "mcp-remote", MCP_URL, "--header", "Authorization:${AUTH_HEADER}"],
          env: { AUTH_HEADER: `Bearer ${token}` },
        },
      },
    },
    null,
    2,
  );
}

function ConfigBlock({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const config = claudeConfig(token);

  async function copy() {
    try {
      await navigator.clipboard.writeText(config);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-4 space-y-3 border-t border-amber-300 pt-4 dark:border-amber-700">
      <p className="font-semibold">Add this to Claude Desktop</p>
      <p className="leading-6">
        Open Claude Desktop, go to <strong>Settings → Developer → Edit Config</strong>, and paste this in. If you already
        have other servers in that file, add only the <code>pipeline</code> entry inside <code>mcpServers</code>. The{" "}
        <a href="/setup" className="font-medium underline underline-offset-4">setup guide</a> covers the steps, including
        installing Node.js.
      </p>
      <pre className="max-h-64 overflow-auto rounded-lg bg-zinc-900 p-3 font-mono text-xs leading-5 text-zinc-100">{config}</pre>
      <button
        type="button"
        onClick={copy}
        className="rounded-md border border-amber-600 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-900 dark:text-amber-50 dark:hover:bg-amber-800"
      >
        {copied ? "Copied" : "Copy config"}
      </button>
    </div>
  );
}

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
          className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Create key
        </button>
      </form>

      {state.error && <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>}

      {state.token && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
          <p className="font-semibold">Copy this key now. It won&apos;t be shown again.</p>
          <code className="mt-2 block break-all rounded bg-white/70 p-2 font-mono text-xs dark:bg-black/40">{state.token}</code>
          <ConfigBlock token={state.token} />
        </div>
      )}
    </div>
  );
}
