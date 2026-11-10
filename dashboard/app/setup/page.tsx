import Link from "next/link";

export default function SetupPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 font-sans text-zinc-800">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900">Connect Claude Desktop</h1>
        <p className="mt-2 text-sm text-zinc-600">
          This takes about ten minutes. You need Claude Desktop, Node.js, and a Pipeline account. Nothing else.
        </p>
        <nav className="mt-3 text-sm">
          <Link href="/keys" className="underline">Back to API keys</Link>
        </nav>
      </header>

      <Section number={1} title="Install Node.js">
        <p>
          Claude Desktop connects to Pipeline through a small helper program that runs on Node.js. Node.js is free and
          you only install it once.
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Go to{" "}
            <a href="https://nodejs.org" className="underline" target="_blank" rel="noreferrer">
              nodejs.org
            </a>{" "}
            and download the <strong>LTS</strong> version. Pick the macOS installer (.pkg) or the Windows installer (.msi).
          </li>
          <li>Open the downloaded file and click through the installer. Keep the default options.</li>
          <li>
            Check that it worked. On a Mac, press Cmd+Space, type <code>Terminal</code>, and press Enter. On Windows,
            open the Start menu and type <code>cmd</code>. In the window, type the two commands below, pressing Enter
            after each:
            <pre className="mt-2 rounded bg-zinc-100 p-3 font-mono text-xs">{"node -v\nnpx -v"}</pre>
            Each should print a version number such as <code>v22.11.0</code>.
          </li>
          <li>
            If you see <code>command not found</code>, quit and reopen Terminal, or restart your computer, then check
            again.
          </li>
        </ol>
      </Section>

      <Section number={2} title="Install Claude Desktop">
        <p>
          Download Claude Desktop from{" "}
          <a href="https://claude.ai/download" className="underline" target="_blank" rel="noreferrer">
            claude.ai/download
          </a>{" "}
          and sign in. You need Claude Desktop itself, not just the website.
        </p>
      </Section>

      <Section number={3} title="Create a key">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Log in to this site and open{" "}
            <Link href="/keys" className="underline">API keys</Link>.
          </li>
          <li>Type a name for this computer, such as <em>my laptop</em>, and click <strong>Create key</strong>.</li>
          <li>
            Click <strong>Copy config</strong>. The key is shown only once, and the copied text includes it. Keep the
            page open until you finish step 4.
          </li>
        </ol>
      </Section>

      <Section number={4} title="Add the config to Claude Desktop">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Fully quit Claude Desktop: press Cmd+Q on a Mac, or right-click its tray icon and choose Quit on Windows.</li>
          <li>
            Open Claude Desktop and go to <strong>Settings → Developer → Edit Config</strong>. This opens the
            configuration file in a text editor.
          </li>
          <li>
            If the file is empty or only has <code>{"{}"}</code>, select everything, delete it, and paste the copied
            config. If the file already has other content, paste only the <code>pipeline</code> entry inside the
            existing <code>mcpServers</code> section, adding a comma after the entry before it.
          </li>
          <li>
            Save the file. In TextEdit on a Mac, choose <strong>Format → Make Plain Text</strong> before you paste,
            and turn off smart quotes under <strong>Edit → Substitutions</strong>.
          </li>
          <li>Quit Claude Desktop again with Cmd+Q, then reopen it.</li>
        </ol>
      </Section>

      <Section number={5} title="Check that it works">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Start a new chat in Claude Desktop.</li>
          <li>Ask: <em>List my applications.</em></li>
          <li>
            The first request can take about a minute, because the server wakes up after being idle. If it fails, wait
            a minute and try again once.
          </li>
        </ol>
      </Section>

      <Section number={6} title="If something goes wrong">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>No pipeline tools appear.</strong> Check that Node.js is installed (step 1) and that you quit and
            reopened Claude Desktop after saving the file.
          </li>
          <li>
            <strong>The file shows an error.</strong> Check for missing commas, missing quotation marks, and any line
            break inside the key. The key must sit on one line between its quotes.
          </li>
          <li>
            <strong>Still not working.</strong> Open Terminal and type <code>which npx</code> (Mac) or{" "}
            <code>where npx</code> (Windows). Replace <code>&quot;npx&quot;</code> in the config with the path it prints,
            then save and restart Claude Desktop.
          </li>
          <li>
            <strong>Lost the key.</strong> Create a new one on the API keys page and copy the new config. You can revoke
            the old key there.
          </li>
        </ul>
      </Section>
    </main>
  );
}

function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 space-y-3 text-sm leading-6">
      <h2 className="text-lg font-semibold text-zinc-900">
        {number}. {title}
      </h2>
      {children}
    </section>
  );
}
