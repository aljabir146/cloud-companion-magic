import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Server } from "lucide-react";
import { StatusBadge } from "./dashboard";

export const Route = createFileRoute("/_authenticated/vps")({
  component: VpsList,
  head: () => ({ meta: [{ title: "My VPS — TigerHost" }] }),
});

function VpsList() {
  const { data: vps = [], isLoading } = useQuery({
    queryKey: ["vps-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vps").select("*, nodes(name,location)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="pixel-font text-2xl font-bold">My VPS <span className="emoji-anim">💻</span></h1>
          <p className="text-sm text-muted-foreground">All your virtual machines and containers.</p>
        </div>
        <Link to="/vps/new" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> Create VPS
        </Link>
      </div>

      {isLoading ? (
        <div className="glass rounded-xl p-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : vps.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <div className="mb-3 text-5xl"><span className="emoji-anim">📦</span></div>
          <h3 className="pixel-font text-lg font-bold">No VPS yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Spin up your first container or VM.</p>
          <Link to="/vps/new" className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> Create VPS</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {vps.map((v: any) => (
            <Link to="/vps/$id" params={{ id: v.id }} key={v.id} className="glass group rounded-xl p-5 transition hover:-translate-y-1">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent text-lg">
                    <span className="emoji-anim">{v.type === "vm" ? "🖥️" : "📦"}</span>
                  </div>
                  <div>
                    <div className="pixel-font font-bold">{v.name}</div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{v.type} · {v.os}</div>
                  </div>
                </div>
                <StatusBadge status={v.status} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <Stat label="CPU" value={`${v.cpu}c`} />
                <Stat label="RAM" value={`${(v.ram_mb / 1024).toFixed(1)}GB`} />
                <Stat label="Disk" value={`${v.storage_gb}GB`} />
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{v.nodes?.name ?? "—"} · {v.nodes?.location ?? ""}</span>
                <span>{v.ip_address ?? "no ip"}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-2 text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="pixel-font text-sm font-bold">{value}</div>
    </div>
  );
}
