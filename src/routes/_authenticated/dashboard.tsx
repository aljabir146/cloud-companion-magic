import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useRealtimeInvalidate } from "@/lib/realtime";
import {
  Server, Cpu, MemoryStick, HardDrive, Plus, Crown, Activity, Network,
  Terminal, FileText, Wrench, Bell, Download, Copy, Boxes, Rocket, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — TigerHost" }] }),
});

function Dashboard() {
  const { user, isAdmin } = useAuth();
  useRealtimeInvalidate("vps", [["vps", user?.id ?? ""], ["vps"]]);

  const { data: vps = [] } = useQuery({
    queryKey: ["vps", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("vps").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: nodes = [] } = useQuery({
    queryKey: ["nodes-summary"],
    queryFn: async () => {
      const { data } = await supabase.from("nodes").select("id,name,status,cpu_cores,ram_gb,storage_gb,vps_capacity,kind");
      return data ?? [];
    },
  });

  const totals = vps.reduce(
    (a, v) => ({
      cpu: a.cpu + v.cpu,
      ram: a.ram + v.ram_mb,
      storage: a.storage + v.storage_gb,
      running: a.running + (v.status === "running" ? 1 : 0),
      stopped: a.stopped + (v.status === "stopped" ? 1 : 0),
      suspended: a.suspended + (v.status === "suspended" ? 1 : 0),
    }),
    { cpu: 0, ram: 0, storage: 0, running: 0, stopped: 0, suspended: 0 }
  );

  const onlineNodes = nodes.filter(n => n.status === "online").length;

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="glass relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/25 via-accent/15 to-background p-6 md:p-8">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[11px] backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot" />
              <span className="text-muted-foreground">System</span>
              <span className="font-semibold text-success">operational</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-foreground">{onlineNodes}/{nodes.length || 0} nodes online</span>
            </div>
            <h1 className="pixel-font text-3xl font-bold leading-tight md:text-4xl">
              Welcome back, <span className="text-gradient">{user?.email?.split("@")[0]}</span>
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Your virtual infrastructure at a glance — LXD containers, port forwards, backups, and live host telemetry.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/vps/new" className="inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:opacity-90">
              <Plus className="h-4 w-4" /> Create VPS
            </Link>
            <Link to="/console" className="inline-flex items-center gap-2 rounded-md border border-border bg-background/70 px-3.5 py-2 text-sm font-medium hover:bg-background">
              <Terminal className="h-4 w-4" /> Console
            </Link>
            {isAdmin && (
              <Link to="/admin" className="inline-flex items-center gap-2 rounded-md border border-border bg-background/70 px-3.5 py-2 text-sm font-medium hover:bg-background">
                <Crown className="h-4 w-4" /> Admin
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* System stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Server} label="Containers" value={vps.length.toString()} accent="from-primary/80 to-accent/80" sub={`${totals.running} running · ${totals.stopped} stopped`} />
        <StatCard icon={Cpu} label="vCPU allocated" value={totals.cpu.toString()} accent="from-success/80 to-primary/60" sub="cores across all VPS" />
        <StatCard icon={MemoryStick} label="Memory" value={`${(totals.ram / 1024).toFixed(1)} GB`} accent="from-accent/80 to-primary/60" sub="reserved RAM" />
        <StatCard icon={HardDrive} label="Storage" value={`${totals.storage} GB`} accent="from-warning/80 to-accent/60" sub="provisioned" />
      </div>

      {/* System & install row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SystemCard nodes={nodes} />
        <InstallCard />
      </div>

      {/* Quick actions — clean icon tiles, no cheap emojis */}
      <div>
        <h2 className="pixel-font mb-3 text-lg font-bold">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          <QuickTile to="/vps" icon={Boxes} label="My VPS" />
          <QuickTile to="/port-forwards" icon={Network} label="Ports" />
          <QuickTile to="/backups" icon={HardDrive} label="Backups" />
          <QuickTile to="/console" icon={Terminal} label="Console" />
          <QuickTile to="/logs" icon={FileText} label="Logs" />
          <QuickTile to="/api-keys" icon={Wrench} label="API Keys" />
          <QuickTile to="/notifications" icon={Bell} label="Alerts" />
        </div>
      </div>

      {/* Recent VPS */}
      <div className="glass rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="pixel-font text-lg font-bold">Recent VPS</h2>
            <p className="text-xs text-muted-foreground">Live status streamed from each node agent</p>
          </div>
          <Link to="/vps" className="text-sm text-primary hover:underline">View all →</Link>
        </div>
        {vps.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 p-10 text-center">
            <Rocket className="mx-auto mb-3 h-8 w-8 text-primary" />
            <p className="text-sm text-muted-foreground">No VPS yet. Spin up your first LXC container.</p>
            <Link to="/vps/new" className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
              <Plus className="h-4 w-4" /> Create VPS
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Type</th>
                  <th className="p-3 text-left">OS</th>
                  <th className="p-3 text-left">Specs</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {vps.slice(0, 5).map((v) => (
                  <tr key={v.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="p-3"><Link to="/vps/$id" params={{ id: v.id }} className="font-semibold text-primary hover:underline">{v.name}</Link></td>
                    <td className="p-3 text-xs uppercase">{v.type}</td>
                    <td className="p-3 text-muted-foreground">{v.os}</td>
                    <td className="p-3 text-muted-foreground">{v.cpu}c · {(v.ram_mb/1024).toFixed(1)}GB · {v.storage_gb}GB</td>
                    <td className="p-3"><StatusBadge status={v.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent, sub }: { icon: typeof Server; label: string; value: string; accent: string; sub: string }) {
  return (
    <div className="glass rounded-xl p-5 transition hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className={`grid h-11 w-11 place-items-center rounded-lg bg-gradient-to-br ${accent} shadow-lg`}>
          <Icon className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-success">live</span>
      </div>
      <div className="mt-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="pixel-font mt-1 text-3xl font-bold">{value}</div>
      <div className="mt-2 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function SystemCard({ nodes }: { nodes: any[] }) {
  return (
    <div className="glass lg:col-span-2 rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-success" />
          <h2 className="pixel-font text-lg font-bold">Cluster health</h2>
        </div>
        <Link to="/nodes" className="text-xs text-primary hover:underline">Manage nodes →</Link>
      </div>
      {nodes.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No nodes registered yet. Install the agent on a host to onboard it.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {nodes.slice(0, 4).map((n) => (
            <div key={n.id} className="rounded-lg border border-border bg-card/40 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${n.status === "online" ? "bg-success pulse-dot" : "bg-muted-foreground"}`} />
                  <span className="font-semibold">{n.name}</span>
                </div>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider">{n.kind}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
                <Spec label="CPU" value={`${n.cpu_cores}c`} />
                <Spec label="RAM" value={`${n.ram_gb}GB`} />
                <Spec label="Disk" value={`${n.storage_gb}GB`} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-background/40 py-1.5">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-bold text-foreground">{value}</div>
    </div>
  );
}

function InstallCard() {
  const cmd = `curl -fsSL ${typeof window !== "undefined" ? window.location.origin : ""}/install.sh | sudo bash`;
  return (
    <div className="glass rounded-2xl p-6">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <h2 className="pixel-font text-lg font-bold">Install on a host</h2>
      </div>
      <p className="text-xs text-muted-foreground">Run this on a KVM/bare-metal box (not inside another LXC) — installs LXD, the daemon, and registers the node.</p>
      <div className="mt-3 rounded-md border border-border bg-background/60 p-3">
        <code className="block whitespace-pre-wrap break-all text-[11px] text-foreground">{cmd}</code>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => { navigator.clipboard.writeText(cmd); toast.success("Copied"); }}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card/50 px-3 py-1.5 text-xs hover:bg-card">
          <Copy className="h-3.5 w-3.5" /> Copy
        </button>
        <a href="/install.sh" download className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
          <Download className="h-3.5 w-3.5" /> Download install.sh
        </a>
        <a href="/agent/lxd-daemon.js" download className="inline-flex items-center gap-2 rounded-md border border-border bg-card/50 px-3 py-1.5 text-xs hover:bg-card">
          <Download className="h-3.5 w-3.5" /> Daemon
        </a>
      </div>
    </div>
  );
}

function QuickTile({ to, icon: Icon, label }: { to: string; icon: typeof Server; label: string }) {
  return (
    <Link to={to as any} className="glass group flex flex-col items-center gap-2 rounded-xl p-4 text-center transition hover:-translate-y-1 hover:border-primary/40">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 text-primary group-hover:from-primary/40 group-hover:to-accent/40">
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-xs font-semibold">{label}</div>
    </Link>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    running: "bg-success/15 text-success",
    stopped: "bg-muted text-muted-foreground",
    suspended: "bg-warning/15 text-warning",
    provisioning: "bg-primary/15 text-primary",
    error: "bg-destructive/15 text-destructive",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${map[status] ?? map.stopped}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === "running" ? "bg-success pulse-dot" : "bg-current"}`} />
      {status}
    </span>
  );
}
