import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Plus, HardDrive, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/nodes")({
  component: Nodes,
  head: () => ({ meta: [{ title: "Nodes — TigerHost" }] }),
});

function Nodes() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [hostname, setHostname] = useState("");
  const [location, setLocation] = useState("");
  const [cpu, setCpu] = useState(16);
  const [ram, setRam] = useState(64);
  const [storage, setStorage] = useState(1000);

  const { data: nodes = [] } = useQuery({
    queryKey: ["nodes"],
    queryFn: async () => (await supabase.from("nodes").select("*").order("created_at")).data ?? [],
  });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("nodes").insert({ name, hostname, location, cpu_cores: cpu, ram_gb: ram, storage_gb: storage });
    if (error) return toast.error(error.message);
    toast.success("Node added");
    setName(""); setHostname(""); setLocation("");
    qc.invalidateQueries({ queryKey: ["nodes"] });
  }

  async function remove(id: string) {
    if (!confirm("Delete this node?")) return;
    await supabase.from("nodes").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["nodes"] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="pixel-font text-2xl font-bold">Nodes <span className="emoji-anim">🗄️</span></h1>
        <p className="text-sm text-muted-foreground">Physical hosts in your cluster. {isAdmin ? "Add and manage them here." : "Read-only — admin required to manage."}</p>
      </div>

      {isAdmin && (
        <form onSubmit={add} className="glass grid grid-cols-2 gap-3 rounded-xl p-5 md:grid-cols-7">
          <input required placeholder="node-02" value={name} onChange={(e) => setName(e.target.value)} className="rounded-md border border-input bg-background/50 px-3 py-2 text-sm" />
          <input required placeholder="hostname" value={hostname} onChange={(e) => setHostname(e.target.value)} className="rounded-md border border-input bg-background/50 px-3 py-2 text-sm" />
          <input required placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} className="rounded-md border border-input bg-background/50 px-3 py-2 text-sm" />
          <input type="number" placeholder="CPU" value={cpu} onChange={(e) => setCpu(+e.target.value)} className="rounded-md border border-input bg-background/50 px-3 py-2 text-sm" />
          <input type="number" placeholder="RAM (GB)" value={ram} onChange={(e) => setRam(+e.target.value)} className="rounded-md border border-input bg-background/50 px-3 py-2 text-sm" />
          <input type="number" placeholder="Disk (GB)" value={storage} onChange={(e) => setStorage(+e.target.value)} className="rounded-md border border-input bg-background/50 px-3 py-2 text-sm" />
          <button className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> Add</button>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {nodes.map((n: any) => (
          <div key={n.id} className="glass rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-success to-primary text-lg"><HardDrive className="h-5 w-5" /></div>
                <div>
                  <div className="pixel-font font-bold">{n.name}</div>
                  <div className="text-xs text-muted-foreground">{n.hostname} · {n.location}</div>
                </div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${n.status === "online" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>● {n.status}</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <Cap label="CPU" used={n.used_cpu} total={n.cpu_cores} unit="c" />
              <Cap label="RAM" used={n.used_ram} total={n.ram_gb} unit="GB" />
              <Cap label="Disk" used={n.used_storage} total={n.storage_gb} unit="GB" />
            </div>
            {isAdmin && (
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/50 pt-3">
                <button onClick={() => { navigator.clipboard.writeText(n.agent_secret); toast.success("Agent secret copied"); }}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <Copy className="h-3 w-3" /> Agent secret
                </button>
                <button onClick={() => remove(n.id)} className="text-destructive hover:opacity-80"><Trash2 className="h-4 w-4" /></button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Cap({ label, used, total, unit }: { label: string; used: number; total: number; unit: string }) {
  const pct = total ? Math.min(100, (used / total) * 100) : 0;
  return (
    <div className="rounded-md border border-border bg-background/40 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="pixel-font text-sm font-bold">{used}/{total}{unit}</div>
      <div className="mt-1 h-1 overflow-hidden rounded bg-secondary"><div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
