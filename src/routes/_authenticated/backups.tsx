import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useRealtimeInvalidate } from "@/lib/realtime";
import { Plus, HardDrive, Trash2, Calendar, Power, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/backups")({
  component: BackupsPage,
  head: () => ({ meta: [{ title: "Backups — TigerHost" }] }),
});

function BackupsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  useRealtimeInvalidate("backups", [["backups"]]);
  const [vpsId, setVpsId] = useState<string>("");
  const [label, setLabel] = useState("");

  const { data: vps = [] } = useQuery({
    queryKey: ["vps-list"],
    queryFn: async () => (await supabase.from("vps").select("id,name,owner_id").order("name")).data ?? [],
  });

  const { data: backups = [] } = useQuery({
    queryKey: ["backups"],
    queryFn: async () => (await supabase.from("backups").select("*, vps(name)").order("created_at", { ascending: false })).data ?? [],
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ["schedules"],
    queryFn: async () => (await supabase.from("backup_schedules").select("*, vps(name)").order("created_at", { ascending: false })).data ?? [],
  });

  const createBackup = useMutation({
    mutationFn: async () => {
      if (!user || !vpsId) throw new Error("Pick a VPS first");
      // Simulate snapshot
      const size = 800 + Math.floor(Math.random() * 4200);
      const { error } = await supabase.from("backups").insert({
        vps_id: vpsId, owner_id: user.id, label: label || `Snapshot ${new Date().toLocaleString()}`,
        size_mb: size, status: "completed", source: "manual",
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Snapshot created"); setLabel(""); qc.invalidateQueries({ queryKey: ["backups"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  async function delBackup(id: string) {
    if (!confirm("Delete backup?")) return;
    await supabase.from("backups").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["backups"] });
  }

  async function addSchedule(vpsId: string, cadence: string) {
    if (!user) return;
    const next = cadence === "hourly" ? 60 * 60_000 : cadence === "weekly" ? 7 * 24 * 3600_000 : 24 * 3600_000;
    await supabase.from("backup_schedules").insert({
      vps_id: vpsId, owner_id: user.id, cadence, enabled: true,
      next_run_at: new Date(Date.now() + next).toISOString(),
    });
    toast.success("Schedule added");
    qc.invalidateQueries({ queryKey: ["schedules"] });
  }

  async function toggleSchedule(id: string, enabled: boolean) {
    await supabase.from("backup_schedules").update({ enabled: !enabled }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["schedules"] });
  }
  async function delSchedule(id: string) {
    await supabase.from("backup_schedules").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["schedules"] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="pixel-font text-3xl">Backups & Schedules <span className="emoji-anim">💾</span></h1>
        <p className="text-sm text-muted-foreground">Snapshot your VPS on demand or on a schedule.</p>
      </div>

      {vps.length === 0 ? (
        <div className="glass rounded-xl p-10 text-center text-sm text-muted-foreground">
          You have no VPS yet. <Link to="/vps/new" className="text-primary hover:underline">Create one →</Link>
        </div>
      ) : (
        <>
          <div className="glass rounded-2xl p-5">
            <div className="mb-3 flex items-center gap-2 pixel-font text-lg"><Plus className="h-5 w-5 text-primary" /> Create snapshot</div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_2fr_auto]">
              <select value={vpsId} onChange={(e) => setVpsId(e.target.value)} className="rounded-md border border-input bg-background/50 px-3 py-2 text-sm">
                <option value="">Select VPS…</option>
                {vps.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              <input placeholder="Label (optional)" value={label} onChange={(e) => setLabel(e.target.value)}
                className="rounded-md border border-input bg-background/50 px-3 py-2 text-sm" />
              <button disabled={!vpsId || createBackup.isPending} onClick={() => createBackup.mutate()}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                <HardDrive className="h-4 w-4" /> Snapshot now
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Backups list */}
            <div className="glass overflow-hidden rounded-2xl">
              <div className="flex items-center gap-2 border-b border-border px-5 py-3 pixel-font">
                <HardDrive className="h-4 w-4" /> Snapshots
              </div>
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr><th className="p-3 text-left">Label</th><th className="p-3 text-left">VPS</th><th className="p-3 text-left">Size</th><th className="p-3 text-left">When</th><th></th></tr>
                </thead>
                <tbody>
                  {backups.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No snapshots yet.</td></tr>}
                  {backups.map((b: any) => (
                    <tr key={b.id} className="border-t border-border hover:bg-secondary/20">
                      <td className="p-3"><span className="emoji-anim mr-1">{b.source === "scheduled" ? "⏱️" : "📸"}</span>{b.label}</td>
                      <td className="p-3 text-muted-foreground">{b.vps?.name ?? "—"}</td>
                      <td className="p-3 text-xs">{(b.size_mb / 1024).toFixed(2)} GB</td>
                      <td className="p-3 text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString()}</td>
                      <td className="p-3"><button onClick={() => delBackup(b.id)} className="text-destructive hover:opacity-80"><Trash2 className="h-4 w-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Schedules */}
            <div className="glass overflow-hidden rounded-2xl">
              <div className="flex items-center gap-2 border-b border-border px-5 py-3 pixel-font">
                <Calendar className="h-4 w-4" /> Schedules
              </div>
              <div className="space-y-3 p-5">
                {schedules.length === 0 && <div className="text-sm text-muted-foreground">No schedules yet — pick a VPS below to create one.</div>}
                {schedules.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/40 p-3">
                    <div>
                      <div className="text-sm font-semibold">{s.vps?.name ?? "—"}</div>
                      <div className="text-[11px] text-muted-foreground">{s.cadence} · next {new Date(s.next_run_at).toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleSchedule(s.id, s.enabled)} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${s.enabled ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                        <Power className="h-3 w-3" /> {s.enabled ? "Enabled" : "Paused"}
                      </button>
                      <button onClick={() => delSchedule(s.id)} className="text-destructive hover:opacity-80"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
                <div className="rounded-lg border border-dashed border-border p-3">
                  <div className="mb-2 text-xs text-muted-foreground">Add schedule for a VPS</div>
                  <div className="flex flex-wrap gap-2">
                    {vps.map((v: any) => (
                      <div key={v.id} className="inline-flex overflow-hidden rounded-md border border-border">
                        <span className="bg-secondary/60 px-2 py-1 text-xs">{v.name}</span>
                        {["hourly","daily","weekly"].map((c) => (
                          <button key={c} onClick={() => addSchedule(v.id, c)} className="border-l border-border bg-background/40 px-2 py-1 text-[11px] hover:bg-primary/20 hover:text-primary">
                            <RefreshCw className="mr-0.5 inline h-3 w-3" /> {c}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
