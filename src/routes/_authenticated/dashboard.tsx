import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useRealtimeInvalidate } from "@/lib/realtime";
import {
  Server, Cpu, MemoryStick, HardDrive, Plus, Crown,
} from "lucide-react";

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

  const totals = vps.reduce(
    (a, v) => ({
      cpu: a.cpu + v.cpu,
      ram: a.ram + v.ram_mb,
      storage: a.storage + v.storage_gb,
      running: a.running + (v.status === "running" ? 1 : 0),
      suspended: a.suspended + (v.status === "suspended" ? 1 : 0),
    }),
    { cpu: 0, ram: 0, storage: 0, running: 0, suspended: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="glass overflow-hidden rounded-2xl bg-gradient-to-br from-primary/30 via-accent/25 to-primary/10 p-6 md:p-8">
        <h1 className="pixel-font text-3xl font-bold md:text-4xl">
          Welcome back, {user?.email?.split("@")[0]} <span className="emoji-anim">🚀</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your virtual infrastructure with ease and precision.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/vps" className="inline-flex items-center gap-2 rounded-md bg-background/80 px-3.5 py-2 text-sm font-medium hover:bg-background">
            <Server className="h-4 w-4" /> Manage VPS
          </Link>
          <Link to="/vps/new" className="inline-flex items-center gap-2 rounded-md border border-border bg-card/40 px-3.5 py-2 text-sm font-medium hover:bg-card">
            <Plus className="h-4 w-4" /> Create New VPS
          </Link>
          {isAdmin && (
            <Link to="/admin" className="inline-flex items-center gap-2 rounded-md border border-border bg-card/40 px-3.5 py-2 text-sm font-medium hover:bg-card">
              <Crown className="h-4 w-4" /> Admin Panel
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Server} emoji="💻" label="Total VPS" value={vps.length.toString()} accent="from-primary to-accent" badge={`${totals.running} running · ${totals.suspended} suspended`} />
        <StatCard icon={Cpu} emoji="🧠" label="Total CPU" value={totals.cpu.toString()} accent="from-success to-primary" badge="Cores allocated" />
        <StatCard icon={MemoryStick} emoji="🎛️" label="Total Memory" value={`${(totals.ram / 1024).toFixed(0)}GB`} accent="from-accent to-primary" badge="Across all VPS" />
        <StatCard icon={HardDrive} emoji="📀" label="Total Storage" value={`${totals.storage}GB`} accent="from-warning to-torch" badge="Provisioned" />
      </div>

      {/* Quick tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <QuickTile to="/vps" emoji="💻" label="My VPS" />
        <QuickTile to="/port-forwards" emoji="🔀" label="Port Forwards" />
        <QuickTile to="/profile" emoji="🙂" label="My Profile" />
        <QuickTile to="/notifications" emoji="🔔" label="Notifications" />
        {isAdmin && <QuickTile to="/admin" emoji="👑" label="Admin Panel" />}
        <QuickTile to="/vps/new" emoji="➕" label="Create VPS" />
      </div>

      {/* VPS recent */}
      <div className="glass rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="pixel-font text-lg font-bold">Recent VPS <span className="emoji-anim">⚡</span></h2>
          <Link to="/vps" className="text-sm text-primary hover:underline">View all →</Link>
        </div>
        {vps.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No VPS yet. <Link to="/vps/new" className="text-primary hover:underline">Create your first one →</Link>
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
                    <td className="p-3 uppercase text-xs">{v.type}</td>
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

function StatCard({ icon: Icon, label, value, accent, badge, emoji }: { icon: typeof Server; label: string; value: string; accent: string; badge: string; emoji: string }) {
  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div className={`grid h-11 w-11 place-items-center rounded-lg bg-gradient-to-br ${accent} text-xl shadow-lg`}>
          <span className="emoji-anim">{emoji}</span>
        </div>
        <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">●</span>
      </div>
      <div className="mt-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="pixel-font mt-1 text-3xl font-bold">{value}</div>
      <div className="mt-2 text-[11px] text-muted-foreground">{badge}</div>
    </div>
  );
}

function QuickTile({ to, emoji, label }: { to: string; emoji: string; label: string }) {
  return (
    <Link to={to as any} className="glass group flex flex-col items-center gap-2 rounded-xl p-5 text-center transition hover:-translate-y-1">
      <div className="text-3xl"><span className="emoji-anim">{emoji}</span></div>
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
