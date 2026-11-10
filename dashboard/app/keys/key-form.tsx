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
    <div className="mt-4 space-y-2 border-t border-amber-300 pt-4">
      <p className="font-semibold text-amber-900">Add this to Claude Desktop</p>
      <p className="text-zinc-700">
        Open Claude Desktop, go to <strong>Settings → Developer → Edit Config</strong>, and paste this in. If you already
        have other servers in that file, add only the <code>pipeline</code> entry inside <code>mcpServers</code>. The{" "}
        <a href="/setup" className="underline">setup guide</a> covers the steps, including installing Node.js.
      </p>
      <pre className="max-h-64 overflow-auto rounded bg-white p-3 font-mono text-xs">{config}</pre>
      <button
        type="button"
        onClick={copy}
        className="rounded border border-zinc-400 bg-white px-3 py-1 text-xs text-zinc-900"
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
          <ConfigBlock token={state.token} />
        </div>
      )}
    </div>
  );
}
