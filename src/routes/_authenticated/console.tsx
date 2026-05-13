import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Terminal as TermIcon, Plug, X as XIcon, ShieldAlert, History } from "lucide-react";
import { consoleExec, startConsoleSession } from "@/lib/console.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/console")({
  component: ConsolePage,
  head: () => ({ meta: [{ title: "Web Console — TigerHost" }] }),
});

type Line = { kind: "out" | "err" | "sys"; text: string };

function ConsolePage() {
  const exec = useServerFn(consoleExec);
  const start = useServerFn(startConsoleSession);

  const [host, setHost] = useState("");
  const [port, setPort] = useState("22");
  const [username, setUsername] = useState("root");
  const [password, setPassword] = useState("root");
  const [nodeId, setNodeId] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cmd, setCmd] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const termRef = useRef<HTMLDivElement>(null);

  const { data: nodes } = useQuery({
    queryKey: ["nodes-list"],
    queryFn: async () => (await supabase.from("nodes").select("id,name,kind,location").order("name")).data ?? [],
  });

  const { data: pastSessions, refetch: refetchSessions } = useQuery({
    queryKey: ["console-sessions"],
    queryFn: async () => (await supabase.from("console_sessions").select("id,host,username,started_at").order("started_at", { ascending: false }).limit(10)).data ?? [],
  });

  const { data: pastLogs } = useQuery({
    queryKey: ["console-logs", sessionId],
    queryFn: async () => (await supabase.from("console_session_logs").select("command,output,ok,created_at").eq("session_id", sessionId!).order("created_at")).data ?? [],
    enabled: !!sessionId,
  });

  useEffect(() => {
    termRef.current?.scrollTo({ top: termRef.current.scrollHeight });
  }, [lines]);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    if (!host.trim()) return toast.error("Enter a host / private IP");
    try {
      const { sessionId: id } = await start({
        data: { host, port: Number(port), username, nodeId: nodeId || null, vpsId: null },
      });
      setSessionId(id);
      setLines([
        { kind: "sys", text: `🌿 TigerHost web-console — session ${id.slice(0, 8)} → ${username}@${host}:${port}` },
        { kind: "sys", text: nodeId ? `Routing through selected node. Real exec attempted via node-agent.` : `No node selected — running in demo mode. Type 'help'.` },
      ]);
      refetchSessions();
    } catch (err: any) {
      toast.error(err?.message || "Could not start session");
    }
  }

  function disconnect() {
    setSessionId(null);
    setLines([]);
    setCmd("");
  }

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!cmd.trim() || busy || !sessionId) return;
    const command = cmd;
    setCmd("");
    setBusy(true);
    try {
      const res = await exec({ data: { sessionId, host, port: Number(port), username, password, command, nodeId: nodeId || null } });
      if (res.output === "__CLEAR__") setLines([]);
      else setLines((prev) => [...prev, { kind: res.ok ? "out" : "err", text: res.output }]);
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

      {!sessionId ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <form onSubmit={connect} className="glass rounded-xl p-6 space-y-4">
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
              <label className="md:col-span-3 text-sm">
                <span className="mb-1 block text-muted-foreground">Route via node (optional, real exec)</span>
                <select value={nodeId} onChange={(e) => setNodeId(e.target.value)}
                  className="w-full rounded-md border border-border bg-background/60 px-3 py-2 outline-none focus:border-primary">
                  <option value="">— Demo mode (no node) —</option>
                  {nodes?.map((n: any) => (
                    <option key={n.id} value={n.id}>{n.name} · {n.location} · {n.kind}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldAlert className="h-4 w-4 mt-0.5 text-primary" />
                <span>Credentials are sent over HTTPS to the TigerHost server only — never stored in the database.</span>
              </div>
              <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                <Plug className="h-4 w-4" /> Connect
              </button>
            </div>
          </form>

          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 pixel-font text-sm font-bold mb-3">
              <History className="h-4 w-4" /> Recent sessions
            </div>
            <ul className="space-y-1.5 text-xs">
              {(pastSessions ?? []).length === 0 && <li className="text-muted-foreground">No sessions yet.</li>}
              {(pastSessions ?? []).map((s: any) => (
                <li key={s.id} className="rounded border border-border bg-card/40 p-2">
                  <div className="font-mono">{s.username}@{s.host}</div>
                  <div className="text-muted-foreground">{new Date(s.started_at).toLocaleString()}</div>
                  <button onClick={() => setSessionId(s.id)} className="mt-1 text-primary hover:underline">view logs →</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="glass overflow-hidden rounded-xl border border-primary/30">
          <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-4 py-2 text-xs">
            <div className="flex items-center gap-2 font-mono">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <TermIcon className="h-3.5 w-3.5" />
              {username}@{host}:{port} · session {sessionId.slice(0, 8)}
            </div>
            <button onClick={disconnect} className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-destructive/20 text-destructive">
              <XIcon className="h-3 w-3" /> Disconnect
            </button>
          </div>
          <div ref={termRef} className="h-[55vh] overflow-y-auto bg-black/85 p-4 font-mono text-[13px] leading-relaxed">
            {(pastLogs ?? []).map((l: any, i) => (
              <pre key={`p${i}`} className={l.ok ? "text-green-300/80 whitespace-pre-wrap" : "text-red-400/80 whitespace-pre-wrap"}>{l.output}</pre>
            ))}
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
