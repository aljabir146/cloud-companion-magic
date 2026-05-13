import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Users, Server, HardDrive, Crown } from "lucide-react";
import { StatusBadge } from "./dashboard";

export const Route = createFileRoute("/_authenticated/admin")({
  component: Admin,
  head: () => ({ meta: [{ title: "Admin — TigerHost" }] }),
});

function Admin() {
  const { isAdmin, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) nav({ to: "/dashboard" });
  }, [isAdmin, loading, nav]);

  const { data: profiles = [] } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => (await supabase.from("profiles").select("*").order("created_at", { ascending: false })).data ?? [],
    enabled: isAdmin,
  });
  const { data: allVps = [] } = useQuery({
    queryKey: ["all-vps"],
    queryFn: async () => (await supabase.from("vps").select("*, profiles!vps_owner_id_fkey(username), nodes(name)").order("created_at", { ascending: false })).data ?? [],
    enabled: isAdmin,
  });
  const { data: nodes = [] } = useQuery({
    queryKey: ["all-nodes"],
    queryFn: async () => (await supabase.from("nodes").select("*")).data ?? [],
    enabled: isAdmin,
  });

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="pixel-font text-2xl font-bold">Admin Panel <span className="emoji-anim">👑</span></h1>
        <p className="text-sm text-muted-foreground">Cluster-wide overview.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat icon={Users} label="Users" value={profiles.length} emoji="👥" />
        <Stat icon={Server} label="All VPS" value={allVps.length} emoji="💻" />
        <Stat icon={HardDrive} label="Nodes" value={nodes.length} emoji="🗄️" />
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="pixel-font mb-4 text-lg font-bold">All VPS</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3 text-left">Name</th><th className="p-3 text-left">Owner</th><th className="p-3 text-left">Type</th><th className="p-3 text-left">Node</th><th className="p-3 text-left">Status</th></tr>
            </thead>
            <tbody>
              {allVps.map((v: any) => (
                <tr key={v.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-3"><Link to="/vps/$id" params={{ id: v.id }} className="font-semibold text-primary hover:underline">{v.name}</Link></td>
                  <td className="p-3 text-muted-foreground">{v.profiles?.username ?? "—"}</td>
                  <td className="p-3 uppercase text-xs">{v.type}</td>
                  <td className="p-3 text-muted-foreground">{v.nodes?.name ?? "—"}</td>
                  <td className="p-3"><StatusBadge status={v.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="pixel-font mb-4 text-lg font-bold">Users</h2>
        <ul className="divide-y divide-border/50">
          {profiles.map((p: any) => (
            <li key={p.id} className="flex items-center gap-3 py-3 text-sm">
              <div className="grid h-8 w-8 place-items-center rounded bg-gradient-to-br from-primary to-accent text-xs font-bold text-primary-foreground">{(p.username?.[0] || "?").toUpperCase()}</div>
              <div className="flex-1">
                <div className="font-semibold">{p.username || "(no username)"}</div>
                <div className="text-xs text-muted-foreground">{p.full_name}</div>
              </div>
              <div className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, emoji }: { icon: any; label: string; value: number; emoji: string }) {
  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div className="text-3xl"><span className="emoji-anim">{emoji}</span></div>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="pixel-font text-3xl font-bold">{value}</div>
    </div>
  );
}
