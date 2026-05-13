import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Terminal as TermIcon, Plug, X as XIcon, ShieldAlert } from "lucide-react";
import { consoleExec } from "@/lib/console.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/console")({
  component: ConsolePage,
  head: () => ({ meta: [{ title: "Web Console — TigerHost" }] }),
});

type Line = { kind: "out" | "err" | "sys"; text: string };

function ConsolePage() {
  const exec = useServerFn(consoleExec);
  const [host, setHost] = useState("");
  const [port, setPort] = useState("22");
  const [username, setUsername] = useState("root");
  const [password, setPassword] = useState("root");
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cmd, setCmd] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const termRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    termRef.current?.scrollTo({ top: termRef.current.scrollHeight });
  }, [lines]);

  function connect(e: React.FormEvent) {
    e.preventDefault();
    if (!host.trim()) return toast.error("Enter a host / private IP");
    setConnected(true);
    setLines([
      { kind: "sys", text: `🌿 TigerHost web-console — connecting to ${username}@${host}:${port} ...` },
      { kind: "sys", text: `Session established. Type 'help' to list demo commands.` },
    ]);
  }

  function disconnect() {
    setConnected(false);
    setLines([]);
    setCmd("");
  }

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!cmd.trim() || busy) return;
    const command = cmd;
    setCmd("");
    setBusy(true);
    try {
      const res = await exec({ data: { host, port: Number(port), username, password, command } });
      if (res.output === "__CLEAR__") {
        setLines([]);
      } else {
        setLines((prev) => [...prev, { kind: res.ok ? "out" : "err", text: res.output }]);
      }
    } catch (err: any) {
      setLines((prev) => [...prev, { kind: "err", text: err?.message || "Exec failed" }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="pixel-font text-3xl font-bold flex items-center gap-2">
          <span className="emoji-anim">🖥️</span> Web Console
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect to any VPS via private IP, port, username and password. LXC containers default to <code className="rounded bg-secondary px-1.5 py-0.5">root / root</code>.
        </p>
      </div>

      {!connected ? (
        <form onSubmit={connect} className="glass max-w-2xl rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="md:col-span-2 text-sm">
              <span className="mb-1 block text-muted-foreground">Private IP / Host</span>
              <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="10.0.0.42"
                className="w-full rounded-md border border-border bg-background/60 px-3 py-2 outline-none focus:border-primary" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Port</span>
              <input value={port} onChange={(e) => setPort(e.target.value)} type="number" min={1} max={65535}
                className="w-full rounded-md border border-border bg-background/60 px-3 py-2 outline-none focus:border-primary" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Username</span>
              <input value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-md border border-border bg-background/60 px-3 py-2 outline-none focus:border-primary" />
            </label>
            <label className="md:col-span-2 text-sm">
              <span className="mb-1 block text-muted-foreground">Password</span>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password"
                className="w-full rounded-md border border-border bg-background/60 px-3 py-2 outline-none focus:border-primary" />
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldAlert className="h-4 w-4 mt-0.5 text-primary" />
              <span>Credentials are sent over HTTPS to the TigerHost server only — never stored.</span>
            </div>
            <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
              <Plug className="h-4 w-4" /> Connect
            </button>
          </div>
        </form>
      ) : (
        <div className="glass overflow-hidden rounded-xl border border-primary/30">
          <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-4 py-2 text-xs">
            <div className="flex items-center gap-2 font-mono">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <TermIcon className="h-3.5 w-3.5" />
              {username}@{host}:{port}
            </div>
            <button onClick={disconnect} className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-destructive/20 text-destructive">
              <XIcon className="h-3 w-3" /> Disconnect
            </button>
          </div>
          <div ref={termRef} className="h-[60vh] overflow-y-auto bg-black/85 p-4 font-mono text-[13px] leading-relaxed">
            {lines.map((l, i) => (
              <pre key={i} className={
                l.kind === "err" ? "text-red-400 whitespace-pre-wrap" :
                l.kind === "sys" ? "text-amber-300 whitespace-pre-wrap" :
                "text-green-300 whitespace-pre-wrap"
              }>{l.text}</pre>
            ))}
            {busy && <div className="text-amber-300/60">…</div>}
          </div>
          <form onSubmit={run} className="flex items-center gap-2 border-t border-border bg-black/85 px-4 py-2 font-mono text-[13px]">
            <span className="text-primary">{username}@{host}</span>
            <span className="text-muted-foreground">$</span>
            <input
              autoFocus
              value={cmd}
              onChange={(e) => setCmd(e.target.value)}
              disabled={busy}
              className="flex-1 bg-transparent text-green-200 outline-none"
              placeholder="type a command, then Enter"
            />
          </form>
        </div>
      )}
    </div>
  );
}
