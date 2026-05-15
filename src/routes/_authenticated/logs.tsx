import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/logs")({
  component: LogsPage,
  head: () => ({ meta: [{ title: "Panel Logs — TigerHost" }] }),
});

type Log = {
  id: string;
  level: string;
  source: string;
  message: string;
  created_at: string;
};

const levelIcon: Record<string, string> = {
  INFO: "ℹ️",
  WARNING: "⚠️",
  ERROR: "❌",
  DEBUG: "🐛",
};

const levelColor: Record<string, string> = {
  INFO: "text-sky-300",
  WARNING: "text-amber-300",
  ERROR: "text-red-400",
  DEBUG: "text-muted-foreground",
};

function fmtTs(iso: string) {
  const d = new Date(iso);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())},${pad(d.getMilliseconds(), 3)}`;
}

function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [filter, setFilter] = useState<"ALL" | "INFO" | "WARNING" | "ERROR">("ALL");
  const [paused, setPaused] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("panel_logs")
        .select("id,level,source,message,created_at")
        .order("created_at", { ascending: false })
        .limit(300);
      if (mounted && data) setLogs(data as Log[]);
    })();

    const channel = supabase
      .channel("panel_logs_live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "panel_logs" }, (payload) => {
        if (!mounted || paused) return;
        setLogs((prev) => [payload.new as Log, ...prev].slice(0, 500));
      })
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [paused]);

  const visible = logs.filter((l) => {
    if (filter !== "ALL" && l.level !== filter) return false;
    if (query && !`${l.source} ${l.message}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="pixel-font text-3xl font-bold flex items-center gap-2">
            <span className="emoji-anim">📜</span> Panel Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Live tail from <code className="rounded bg-secondary px-1 py-0.5">tigerhost_panel</code>, <code className="rounded bg-secondary px-1 py-0.5">werkzeug</code>, agents and TigerHost. Streamed in real time.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            placeholder="filter…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded-md border border-border bg-background/60 px-3 py-1.5 text-sm outline-none focus:border-primary"
          />
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)}
            className="rounded-md border border-border bg-background/60 px-3 py-1.5 text-sm outline-none">
            <option value="ALL">All levels</option>
            <option value="INFO">INFO</option>
            <option value="WARNING">WARNING</option>
            <option value="ERROR">ERROR</option>
          </select>
          <button onClick={() => setPaused((p) => !p)}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${paused ? "bg-amber-500/20 text-amber-300" : "bg-success/20 text-success"}`}>
            {paused ? "▶ Resume" : "⏸ Pause"}
          </button>
        </div>
      </div>

      <div className="glass overflow-hidden rounded-xl border border-border">
        <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-4 py-2 text-xs font-mono">
          <span>tigerhost.log · {visible.length} entries</span>
          <span className={paused ? "text-amber-300" : "text-success"}>
            {paused ? "● paused" : "● live"}
          </span>
        </div>
        <div className="h-[68vh] overflow-y-auto bg-black/85 px-4 py-3 font-mono text-[12.5px] leading-relaxed">
          {visible.length === 0 && <div className="text-muted-foreground">No log entries match.</div>}
          {visible.map((l) => (
            <div key={l.id} className="flex gap-2 py-0.5">
              <span className="shrink-0">{levelIcon[l.level] ?? "•"}</span>
              <span className={`shrink-0 ${levelColor[l.level] ?? "text-foreground"}`}>
                {fmtTs(l.created_at)} - {l.source} - {l.level}
              </span>
              <span className="text-zinc-200 break-all">- {l.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
