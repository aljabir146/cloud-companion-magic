import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Play, Square, RefreshCw, Trash2, Terminal, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "./dashboard";
import { useRealtimeInvalidate } from "@/lib/realtime";

export const Route = createFileRoute("/_authenticated/vps/$id")({
  component: VpsDetail,
  head: () => ({ meta: [{ title: "VPS — TigerHost" }] }),
});

function VpsDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  useRealtimeInvalidate("vps", [["vps", id]]);
  useRealtimeInvalidate("vps_logs", [["vps-logs", id]]);

  const { data: vps, isLoading } = useQuery({
    queryKey: ["vps", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("vps").select("*, nodes(name,location)").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["vps-logs", id],
    queryFn: async () => {
      const { data } = await supabase.from("vps_logs").select("*").eq("vps_id", id).order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  // Mock realtime metrics
  const [metrics, setMetrics] = useState<{ cpu: number; ram: number; net: number }[]>([]);
  useEffect(() => {
    if (vps?.status !== "running") return;
    const id = setInterval(() => {
      setMetrics((m) => [...m.slice(-29), {
        cpu: 10 + Math.random() * 60,
        ram: 30 + Math.random() * 40,
        net: Math.random() * 100,
      }]);
    }, 1000);
    return () => clearInterval(id);
  }, [vps?.status]);

  async function action(kind: "start" | "stop" | "restart" | "delete") {
    if (!vps) return;
    if (kind === "delete") {
      if (!confirm("Delete this VPS permanently?")) return;
      await supabase.from("vps").delete().eq("id", vps.id);
      toast.success("VPS deleted");
      return nav({ to: "/vps" });
    }
    const next = kind === "stop" ? "stopped" : "running";
    await supabase.from("vps").update({ status: kind === "restart" ? "provisioning" : next }).eq("id", vps.id);
    await supabase.from("vps_logs").insert({ vps_id: vps.id, action: kind, message: `User triggered ${kind}` });
    if (kind === "restart") setTimeout(async () => { await supabase.from("vps").update({ status: "running" }).eq("id", vps.id); qc.invalidateQueries({ queryKey: ["vps", id] }); }, 1500);
    toast.success(`${kind} sent`);
    qc.invalidateQueries({ queryKey: ["vps", id] });
    qc.invalidateQueries({ queryKey: ["vps-logs", id] });
  }

  const max = 100;
  const points = useMemo(() => metrics.map((m, i) => ({ i, ...m })), [metrics]);

  if (isLoading || !vps) return <div className="glass rounded-xl p-8 text-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <Link to="/vps" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Back to list</Link>

      <div className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-2xl shadow-lg">
              <span className="emoji-anim">{vps.type === "vm" ? "🖥️" : "📦"}</span>
            </div>
            <div>
              <h1 className="pixel-font text-2xl font-bold">{vps.name}</h1>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <StatusBadge status={vps.status} />
                <span>·</span><span className="uppercase">{vps.type}</span>
                <span>·</span><span>{vps.os}</span>
                <span>·</span><span>{vps.ip_address ?? "no ip"}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => action("start")} disabled={vps.status === "running"} icon={Play} label="Start" tone="success" />
            <Btn onClick={() => action("stop")} disabled={vps.status === "stopped"} icon={Square} label="Stop" tone="warn" />
            <Btn onClick={() => action("restart")} icon={RefreshCw} label="Restart" />
            <Btn onClick={() => action("delete")} icon={Trash2} label="Delete" tone="danger" />
          </div>
        </div>
      </div>

      {/* Specs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SpecCard emoji="🧠" label="CPU" value={`${vps.cpu} cores`} />
        <SpecCard emoji="🎛️" label="RAM" value={`${(vps.ram_mb/1024).toFixed(1)} GB`} />
        <SpecCard emoji="📀" label="Disk" value={`${vps.storage_gb} GB`} />
        <SpecCard emoji="🗄️" label="Node" value={vps.nodes?.name ?? "auto"} sub={vps.nodes?.location} />
      </div>

      {/* Default credentials (LXC) */}
      {vps.type === "lxc" && (
        <div className="glass rounded-2xl p-5 border border-primary/30">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="pixel-font text-sm font-bold">🔑 Default LXC credentials</div>
              <div className="mt-1 text-xs text-muted-foreground">Auto-provisioned for every container. Change after first login.</div>
              <div className="mt-3 flex flex-wrap gap-3 font-mono text-xs">
                <span className="rounded bg-secondary px-2 py-1">host: {vps.ip_address ?? "—"}</span>
                <span className="rounded bg-secondary px-2 py-1">port: 22</span>
                <span className="rounded bg-secondary px-2 py-1">user: root</span>
                <span className="rounded bg-secondary px-2 py-1">pass: root</span>
              </div>
            </div>
            <Link to="/console" className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90">
              🖥️ Open Web Console
            </Link>
          </div>
        </div>
      )}

      {/* Live metrics */}
      <div className="glass rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="pixel-font text-lg font-bold">Live metrics <span className="emoji-anim">📈</span></h2>
          <div className="text-xs text-muted-foreground">{vps.status === "running" ? "streaming" : "VPS not running"}</div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Sparkline label="CPU %" color="oklch(0.72 0.18 250)" series={points.map(p => p.cpu)} max={max} />
          <Sparkline label="RAM %" color="oklch(0.7 0.22 295)" series={points.map(p => p.ram)} max={max} />
          <Sparkline label="Net Mbps" color="oklch(0.7 0.18 155)" series={points.map(p => p.net)} max={max} />
        </div>
      </div>

      {/* Console mock */}
      <div className="glass overflow-hidden rounded-2xl">
        <div className="flex items-center gap-2 border-b border-border bg-secondary/30 px-4 py-2 text-xs">
          <Terminal className="h-4 w-4" /> Console
        </div>
        <pre className="bg-black/60 p-4 font-mono text-xs leading-relaxed text-success">
{`tigerhost@${vps.name}:~$ uname -a
Linux ${vps.name} 6.5.0-tigerhost #1 SMP ${vps.os} x86_64 GNU/Linux
tigerhost@${vps.name}:~$ uptime
 up 3 days, load average: 0.${Math.floor(Math.random()*99)}, 0.${Math.floor(Math.random()*99)}, 0.${Math.floor(Math.random()*99)}
tigerhost@${vps.name}:~$ _`}
        </pre>
      </div>

      {/* Logs */}
      <div className="glass rounded-2xl p-6">
        <h2 className="pixel-font mb-4 text-lg font-bold">Activity log <span className="emoji-anim">📜</span></h2>
        {logs.length === 0 ? (
          <div className="text-sm text-muted-foreground">No activity yet.</div>
        ) : (
          <ul className="space-y-2 text-sm">
            {logs.map((l: any) => (
              <li key={l.id} className="flex items-start gap-3 border-b border-border/40 pb-2 last:border-0">
                <span className="rounded bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase">{l.action}</span>
                <div className="flex-1">{l.message}</div>
                <span className="text-[10px] text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Btn({ icon: Icon, label, onClick, disabled, tone }: { icon: any; label: string; onClick: () => void; disabled?: boolean; tone?: "success" | "warn" | "danger" }) {
  const cls = tone === "danger" ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
    : tone === "warn" ? "bg-warning/15 text-warning hover:bg-warning/25"
    : tone === "success" ? "bg-success/15 text-success hover:bg-success/25"
    : "bg-secondary hover:bg-secondary/70";
  return (
    <button onClick={onClick} disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-40 ${cls}`}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function SpecCard({ emoji, label, value, sub }: { emoji: string; label: string; value: string; sub?: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="text-2xl"><span className="emoji-anim">{emoji}</span></div>
      <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="pixel-font text-lg font-bold">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Sparkline({ label, series, max, color }: { label: string; series: number[]; max: number; color: string }) {
  const w = 220, h = 60;
  const pts = series.length < 2 ? "" : series.map((v, i) => `${(i / (series.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  const last = series[series.length - 1] ?? 0;
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="pixel-font font-bold" style={{ color }}>{last.toFixed(0)}</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full">
        <polyline fill="none" stroke={color} strokeWidth="2" points={pts} />
        {series.length > 0 && <polyline fill={color} fillOpacity="0.15" stroke="none"
          points={`0,${h} ${pts} ${w},${h}`} />}
      </svg>
    </div>
  );
}
