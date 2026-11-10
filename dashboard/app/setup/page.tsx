import Link from "next/link";

export default function SetupPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 font-sans text-zinc-800 dark:text-zinc-200">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Setup guide</p>
        <h1 className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">Connect Claude Desktop</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          About ten minutes, done once. You need Claude Desktop, Node.js, and a Pipeline account.
        </p>

        <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="font-medium text-zinc-900 dark:text-zinc-100">What you need</p>
          <ul className="mt-2 space-y-1 text-zinc-600 dark:text-zinc-400">
            <li>☐ Claude Desktop (step 2)</li>
            <li>☐ Node.js, which Claude Desktop uses to reach Pipeline (step 1)</li>
            <li>☐ A Pipeline login and a key from the API keys page (step 3)</li>
          </ul>
        </div>

        <nav className="mt-4 text-sm">
          <Link href="/keys" className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100">
            Back to API keys
          </Link>
        </nav>
      </header>

      <Step number={1} title="Install Node.js">
        <Callout tone="required">
          Node.js is required. Claude Desktop can&apos;t reach Pipeline without it, and it&apos;s free.
        </Callout>
        <ol className="list-decimal space-y-3 pl-5">
          <li>
            Go to{" "}
            <a href="https://nodejs.org" className="font-medium underline underline-offset-4" target="_blank" rel="noreferrer">
              nodejs.org
            </a>{" "}
            and download the <strong>LTS</strong> version. Pick the macOS installer (.pkg) or the Windows installer (.msi).
          </li>
          <li>Open the file you downloaded and click through the installer. Keep the default options.</li>
          <li>
            Check that it worked. On a Mac, press <kbd>Cmd</kbd>+<kbd>Space</kbd>, type <code>Terminal</code>, and press
            Enter. On Windows, open the Start menu and type <code>cmd</code>. Type each command below and press Enter
            after each one:
            <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-900 p-3 font-mono text-xs leading-5 text-zinc-100">
              {"node -v\nnpx -v"}
            </pre>
            Each should print a version number such as <code>v22.11.0</code>.
          </li>
          <li>
            If you see <code>command not found</code>, quit and reopen Terminal, or restart your computer, then check
            again.
          </li>
        </ol>
      </Step>

      <Step number={2} title="Install Claude Desktop">
        <p>
          Download Claude Desktop from{" "}
          <a href="https://claude.ai/download" className="font-medium underline underline-offset-4" target="_blank" rel="noreferrer">
            claude.ai/download
          </a>{" "}
          and sign in. You need the Claude Desktop app, not just the website.
        </p>
      </Step>

      <Step number={3} title="Create a key">
        <ol className="list-decimal space-y-3 pl-5">
          <li>
            Log in to this site and open{" "}
            <Link href="/keys" className="font-medium underline underline-offset-4">
              API keys
            </Link>
            .
          </li>
          <li>
            Type a name for this computer, such as <em>my laptop</em>, and click <strong>Create key</strong>.
          </li>
          <li>
            Click <strong>Copy config</strong>. The key is shown only once, and the copied text includes it. Keep the page
            open until step 4 is done.
          </li>
        </ol>
      </Step>

      <Step number={4} title="Add the config to Claude Desktop">
        <ol className="list-decimal space-y-3 pl-5">
          <li>
            Fully quit Claude Desktop: press <kbd>Cmd</kbd>+<kbd>Q</kbd> on a Mac, or right-click its tray icon and choose
            Quit on Windows.
          </li>
          <li>
            Open Claude Desktop and go to <strong>Settings → Developer → Edit Config</strong>. This opens the configuration
            file in a text editor.
          </li>
          <li>
            If the file is empty or only has <code>{"{}"}</code>, select everything, delete it, and paste the copied
            config. If the file already has other content, paste only the <code>pipeline</code> entry inside the existing{" "}
            <code>mcpServers</code> section, with a comma after the entry before it.
          </li>
          <li>
            Save the file. In TextEdit on a Mac, first choose <strong>Format → Make Plain Text</strong>, and turn off smart
            quotes under <strong>Edit → Substitutions</strong>.
          </li>
          <li>
            Quit Claude Desktop again with <kbd>Cmd</kbd>+<kbd>Q</kbd>, then reopen it.
          </li>
        </ol>
      </Step>

      <Step number={5} title="Check that it works">
        <ol className="list-decimal space-y-3 pl-5">
          <li>Start a new chat in Claude Desktop.</li>
          <li>
            Ask: <em>List my applications.</em>
          </li>
          <li>
            The first request can take about a minute, because the server wakes up after being idle. If it fails, wait a
            minute and try once more.
          </li>
        </ol>
      </Step>

      <Step number={6} title="If something goes wrong">
        <ul className="space-y-3">
          <li>
            <strong>No pipeline tools appear.</strong> Check that Node.js is installed (step 1), and that you quit and
            reopened Claude Desktop after saving the file.
          </li>
          <li>
            <strong>The file shows an error.</strong> Look for missing commas, missing quotation marks, and any line break
            inside the key. The key must sit on one line between its quotes.
          </li>
          <li>
            <strong>Still not working.</strong> In Terminal, type <code>which npx</code> (Mac) or <code>where npx</code>{" "}
            (Windows). Replace <code>&quot;npx&quot;</code> in the config with the path it prints, then save and restart
            Claude Desktop.
          </li>
          <li>
            <strong>Lost the key.</strong> Create a new one on the API keys page and copy the new config. You can revoke
            the old key there.
          </li>
        </ul>
      </Step>
    </main>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 text-sm leading-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-3 flex items-center gap-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900">
          {number}
        </span>
        {title}
      </h2>
      <div className="space-y-3 sm:pl-10">{children}</div>
    </section>
  );
}

function Callout({ tone, children }: { tone: "required" | "tip"; children: React.ReactNode }) {
  const styles =
    tone === "required"
      ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
      : "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100";
  return <p className={`rounded-lg border px-3 py-2 ${styles}`}>{children}</p>;
}
