import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/port-forwards")({
  component: PortForwards,
  head: () => ({ meta: [{ title: "Port Forwarding — TigerHost" }] }),
});

function PortForwards() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [vpsId, setVpsId] = useState("");
  const [ext, setExt] = useState(0);
  const [intp, setIntp] = useState(0);
  const [proto, setProto] = useState<"tcp" | "udp">("tcp");

  const { data: vps = [] } = useQuery({
    queryKey: ["vps-pf"],
    queryFn: async () => (await supabase.from("vps").select("id,name")).data ?? [],
  });
  const { data: forwards = [] } = useQuery({
    queryKey: ["forwards"],
    queryFn: async () => (await supabase.from("port_forwards").select("*, vps(name)").order("created_at", { ascending: false })).data ?? [],
  });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !vpsId) return;
    const { error } = await supabase.from("port_forwards").insert({
      owner_id: user.id, vps_id: vpsId, external_port: ext, internal_port: intp, protocol: proto,
    });
    if (error) return toast.error(error.message);
    toast.success("Forward added");
    setExt(0); setIntp(0);
    qc.invalidateQueries({ queryKey: ["forwards"] });
  }

  async function remove(id: string) {
    await supabase.from("port_forwards").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["forwards"] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="pixel-font text-2xl font-bold">Port Forwarding <span className="emoji-anim">🔀</span></h1>
        <p className="text-sm text-muted-foreground">Map external ports to your VPS.</p>
      </div>

      <form onSubmit={add} className="glass grid grid-cols-1 gap-3 rounded-xl p-5 md:grid-cols-5">
        <select required value={vpsId} onChange={(e) => setVpsId(e.target.value)} className="rounded-md border border-input bg-background/50 px-3 py-2 text-sm">
          <option value="">Select VPS</option>
          {vps.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <input required type="number" placeholder="External port" value={ext || ""} onChange={(e) => setExt(+e.target.value)} className="rounded-md border border-input bg-background/50 px-3 py-2 text-sm" />
        <input required type="number" placeholder="Internal port" value={intp || ""} onChange={(e) => setIntp(+e.target.value)} className="rounded-md border border-input bg-background/50 px-3 py-2 text-sm" />
        <select value={proto} onChange={(e) => setProto(e.target.value as any)} className="rounded-md border border-input bg-background/50 px-3 py-2 text-sm">
          <option value="tcp">TCP</option><option value="udp">UDP</option>
        </select>
        <button className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> Add
        </button>
      </form>

      <div className="glass overflow-hidden rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-3 text-left">VPS</th><th className="p-3 text-left">External</th><th className="p-3 text-left">→</th><th className="p-3 text-left">Internal</th><th className="p-3 text-left">Protocol</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {forwards.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No forwards yet.</td></tr>}
            {forwards.map((f: any) => (
              <tr key={f.id} className="border-t border-border hover:bg-secondary/30">
                <td className="p-3 font-semibold">{f.vps?.name}</td>
                <td className="p-3 pixel-font">:{f.external_port}</td>
                <td className="p-3 text-muted-foreground">→</td>
                <td className="p-3 pixel-font">:{f.internal_port}</td>
                <td className="p-3 uppercase text-xs">{f.protocol}</td>
                <td className="p-3 text-right">
                  <button onClick={() => remove(f.id)} className="text-destructive hover:opacity-80"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
