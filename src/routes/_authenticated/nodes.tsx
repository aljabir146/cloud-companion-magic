import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useRealtimeInvalidate } from "@/lib/realtime";
import { Plus, HardDrive, Trash2, Copy, ServerCog, Globe, Cpu, ArrowLeft, ShieldCheck, Info, Wand2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/nodes")({
  component: Nodes,
  head: () => ({ meta: [{ title: "Nodes — TigerHost" }] }),
});

function Nodes() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  useRealtimeInvalidate("nodes", [["nodes"]]);
  const [creating, setCreating] = useState(false);

  const { data: nodes = [] } = useQuery({
    queryKey: ["nodes"],
    queryFn: async () => (await supabase.from("nodes").select("*").order("created_at")).data ?? [],
  });

  async function remove(id: string) {
    if (!confirm("Delete this node?")) return;
    await supabase.from("nodes").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["nodes"] });
  }

  if (creating && isAdmin) return <CreateNode onDone={() => { setCreating(false); qc.invalidateQueries({ queryKey: ["nodes"] }); }} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="pixel-font text-3xl">Nodes <span className="emoji-anim">🗄️</span></h1>
          <p className="text-sm text-muted-foreground">Physical hosts in your cluster — local or remote (via API).</p>
        </div>
        {isAdmin && (
          <button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:opacity-90">
            <Plus className="h-4 w-4" /> Create Node
          </button>
        )}
      </div>

      {nodes.length === 0 ? (
        <div className="glass rounded-xl p-10 text-center">
          <div className="text-4xl"><span className="emoji-anim">🗄️</span></div>
          <div className="mt-3 text-sm text-muted-foreground">No nodes yet. {isAdmin ? "Create one to get started." : "Ask an admin to register one."}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {nodes.map((n: any) => (
            <div key={n.id} className="glass relative overflow-hidden rounded-xl p-5">
              <div className="absolute right-3 top-3 flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${n.status === "online" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>● {n.status}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${n.kind === "remote" ? "bg-accent/20 text-accent" : "bg-primary/15 text-primary"}`}>
                  {n.kind === "remote" ? "🌐 Remote" : "🖥️ Local"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent text-lg"><HardDrive className="h-5 w-5" /></div>
                <div>
                  <div className="pixel-font text-lg">{n.name}</div>
                  <div className="text-xs text-muted-foreground">{n.hostname} · {n.location}</div>
                </div>
              </div>
              {n.kind === "remote" && n.api_url && (
                <div className="mt-3 truncate rounded-md border border-border bg-background/40 px-2 py-1 font-mono text-[10px] text-muted-foreground">
                  <Globe className="mr-1 inline h-3 w-3" /> {n.api_url}
                </div>
              )}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <Cap label="CPU" used={n.used_cpu} total={n.cpu_cores} unit="c" />
                <Cap label="RAM" used={n.used_ram} total={n.ram_gb} unit="GB" />
                <Cap label="Disk" used={n.used_storage} total={n.storage_gb} unit="GB" />
              </div>
              <div className="mt-3 text-[11px] text-muted-foreground">Capacity: {n.vps_capacity ?? 50} VPS</div>
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
      )}
    </div>
  );
}

function Cap({ label, used, total, unit }: { label: string; used: number; total: number; unit: string }) {
  const pct = total ? Math.min(100, (used / total) * 100) : 0;
  return (
    <div className="rounded-md border border-border bg-background/40 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="pixel-font text-sm">{used}/{total}{unit}</div>
      <div className="mt-1 h-1 overflow-hidden rounded bg-secondary"><div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function CreateNode({ onDone }: { onDone: () => void }) {
  const [kind, setKind] = useState<"local" | "remote">("local");
  const [name, setName] = useState("");
  const [hostname, setHostname] = useState("");
  const [location, setLocation] = useState("");
  const [cpu, setCpu] = useState(16);
  const [ram, setRam] = useState(64);
  const [storage, setStorage] = useState(1000);
  const [capacity, setCapacity] = useState(50);
  const [tags, setTags] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [verifySsl, setVerifySsl] = useState(true);
  const [testing, setTesting] = useState(false);

  const create = useMutation({
    mutationFn: async () => {
      const payload: any = {
        kind, name,
        hostname: kind === "local" ? (hostname || name) : (apiUrl ? new URL(apiUrl).host : hostname || name),
        location: location || "Default",
        cpu_cores: cpu, ram_gb: ram, storage_gb: storage,
        vps_capacity: capacity,
        tags: tags.split(",").map(s => s.trim()).filter(Boolean),
        api_url: kind === "remote" ? apiUrl : null,
        verify_ssl: verifySsl,
      };
      const { error } = await supabase.from("nodes").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Node created"); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });

  async function testConn() {
    if (!apiUrl) return toast.error("Enter a Node URL first");
    setTesting(true);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(apiUrl.replace(/\/$/, "") + "/health", { signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) toast.success(`Reachable (${res.status})`);
      else toast.error(`Got ${res.status}`);
    } catch (e: any) {
      toast.error("Could not reach node — check URL & CORS");
    } finally { setTesting(false); }
  }

  return (
    <div className="space-y-6">
      <button onClick={onDone} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back to Nodes
      </button>
      <div>
        <h1 className="pixel-font text-3xl">Create New Node <span className="emoji-anim">🗄️</span></h1>
        <p className="text-sm text-muted-foreground">Add a new LXC / VM host to your infrastructure.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Basic */}
        <div className="glass rounded-2xl p-6">
          <div className="mb-4 flex items-center gap-2 pixel-font text-lg">
            <Info className="h-5 w-5 text-primary" /> Basic Information
          </div>
          <div className="space-y-4">
            <Field label="Node Name" required>
              <input required placeholder="e.g., node-us-01" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-input bg-background/50 px-3 py-2.5 text-sm" />
              <Help>Unique identifier for this node</Help>
            </Field>
            <Field label="Location" required>
              <input required placeholder="e.g., New York, USA" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full rounded-md border border-input bg-background/50 px-3 py-2.5 text-sm" />
              <Help>Physical location of the node</Help>
            </Field>
            <Field label="Hostname">
              <input placeholder="e.g., node01.tigerhost.io" value={hostname} onChange={(e) => setHostname(e.target.value)} className="w-full rounded-md border border-input bg-background/50 px-3 py-2.5 text-sm" />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="CPU (cores)"><input type="number" value={cpu} onChange={(e) => setCpu(+e.target.value)} className="w-full rounded-md border border-input bg-background/50 px-3 py-2.5 text-sm" /></Field>
              <Field label="RAM (GB)"><input type="number" value={ram} onChange={(e) => setRam(+e.target.value)} className="w-full rounded-md border border-input bg-background/50 px-3 py-2.5 text-sm" /></Field>
              <Field label="Disk (GB)"><input type="number" value={storage} onChange={(e) => setStorage(+e.target.value)} className="w-full rounded-md border border-input bg-background/50 px-3 py-2.5 text-sm" /></Field>
            </div>
            <Field label="VPS Capacity">
              <input type="number" value={capacity} onChange={(e) => setCapacity(+e.target.value)} className="w-full rounded-md border border-input bg-background/50 px-3 py-2.5 text-sm" />
              <Help>Maximum number of VPS this node can host</Help>
            </Field>
            <Field label="Tags (comma-separated)">
              <input placeholder="e.g., production, high-performance, ssd" value={tags} onChange={(e) => setTags(e.target.value)} className="w-full rounded-md border border-input bg-background/50 px-3 py-2.5 text-sm" />
              <Help>Optional tags for categorization</Help>
            </Field>
          </div>
        </div>

        {/* Connection */}
        <div className="glass rounded-2xl p-6">
          <div className="mb-4 flex items-center gap-2 pixel-font text-lg">
            <ServerCog className="h-5 w-5 text-accent" /> Connection Settings
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-background/30 p-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input type="radio" checked={kind === "local"} onChange={() => setKind("local")} className="mt-1 accent-primary" />
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold"><Cpu className="h-4 w-4" /> Local Node</div>
                <div className="text-xs text-muted-foreground">Run the panel and the node agent on the same machine. No URL needed.</div>
              </div>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <input type="radio" checked={kind === "remote"} onChange={() => setKind("remote")} className="mt-1 accent-primary" />
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold"><Globe className="h-4 w-4" /> Remote Node (via API)</div>
                <div className="text-xs text-muted-foreground">This node is accessed remotely via the agent HTTP API.</div>
              </div>
            </label>
          </div>

          {kind === "remote" && (
            <div className="mt-4 space-y-4">
              <Field label="Node URL" required>
                <input required type="url" placeholder="http://192.168.1.100:5000" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} className="w-full rounded-md border border-input bg-background/50 px-3 py-2.5 text-sm font-mono" />
                <Help>Enter the full URL with http:// or https://</Help>
                <div className="mt-1 text-[11px] text-muted-foreground">Example: <code className="rounded bg-secondary px-1 py-0.5">http://192.168.1.100:5000</code></div>
              </Field>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={verifySsl} onChange={(e) => setVerifySsl(e.target.checked)} className="accent-primary" />
                <ShieldCheck className="h-4 w-4 text-success" /> Verify SSL Certificate
              </label>
              <div className="text-[11px] text-muted-foreground">Uncheck this for self-signed certificates or if you get SSL errors.</div>
              <button onClick={testConn} disabled={testing} className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs hover:bg-secondary/70 disabled:opacity-50">
                <Wand2 className="h-3.5 w-3.5" /> {testing ? "Testing…" : "Test Connection"}
              </button>

              <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 text-xs">
                <div className="mb-2 font-semibold text-primary">Remote Node Setup:</div>
                <ol className="list-decimal space-y-1 pl-4 text-muted-foreground">
                  <li>Deploy <code className="rounded bg-secondary px-1">node-agent.py</code> on the remote server <Link to="/api-keys" className="text-primary hover:underline">(download)</Link></li>
                  <li>Ensure the node is accessible via the URL above</li>
                  <li>An agent secret will be generated automatically below</li>
                  <li>Configure the secret on the remote node</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onDone} className="rounded-md border border-border bg-card/50 px-4 py-2 text-sm">Cancel</button>
        <button disabled={create.isPending || !name || !location || (kind === "remote" && !apiUrl)} onClick={() => create.mutate()}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:opacity-90 disabled:opacity-50">
          <Plus className="h-4 w-4" /> {create.isPending ? "Creating…" : "Create Node"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-semibold text-foreground">{label} {required && <span className="text-destructive">*</span>}</div>
      {children}
    </label>
  );
}
function Help({ children }: { children: React.ReactNode }) {
  return <div className="mt-1 text-[11px] text-muted-foreground">{children}</div>;
}
