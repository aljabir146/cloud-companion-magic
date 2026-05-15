import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Rocket } from "lucide-react";

export const Route = createFileRoute("/_authenticated/vps/new")({
  component: NewVps,
  head: () => ({ meta: [{ title: "Create VPS — TigerHost" }] }),
});

const OS_OPTIONS = [
  { v: "ubuntu-22.04", e: "🐧", l: "Ubuntu 22.04" },
  { v: "ubuntu-24.04", e: "🐧", l: "Ubuntu 24.04" },
  { v: "debian-12", e: "🌀", l: "Debian 12" },
  { v: "alpine-3.19", e: "🏔️", l: "Alpine 3.19" },
  { v: "rocky-9", e: "🪨", l: "Rocky Linux 9" },
  { v: "windows-server-2022", e: "🪟", l: "Windows Server 2022 (VM)" },
];

function NewVps() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [type, setType] = useState<"lxc" | "vm">("lxc");
  const [os, setOs] = useState("ubuntu-22.04");
  const [cpu, setCpu] = useState(2);
  const [ramMb, setRamMb] = useState(2048);
  const [storage, setStorage] = useState(20);
  const [nodeId, setNodeId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const { data: nodes = [] } = useQuery({
    queryKey: ["nodes-pick"],
    queryFn: async () => {
      const { data } = await supabase.from("nodes").select("id,name,location,cpu_cores,ram_gb,storage_gb,used_cpu,used_ram,used_storage,status");
      return data ?? [];
    },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const ip = `10.20.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
    const { data, error } = await supabase.from("vps").insert({
      owner_id: user.id, name, type, os, cpu, ram_mb: ramMb, storage_gb: storage,
      node_id: nodeId || null, status: "provisioning", ip_address: ip,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).select().single();
    if (error) {
      setSubmitting(false);
      return toast.error(error.message);
    }
    // simulate provisioning then start
    setTimeout(async () => {
      await supabase.from("vps").update({ status: "running" }).eq("id", data.id);
      await supabase.from("vps_logs").insert({ vps_id: data.id, action: "create", message: `Provisioned ${type.toUpperCase()} ${os}` });
    }, 1500);
    toast.success("VPS provisioning started");
    nav({ to: "/vps/$id", params: { id: data.id } });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="pixel-font text-2xl font-bold">Create VPS <span className="emoji-anim">🚀</span></h1>
        <p className="text-sm text-muted-foreground">Choose engine, OS, specs and a node.</p>
      </div>

      <form onSubmit={submit} className="glass space-y-6 rounded-xl p-6">
        <Field label="Name">
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="my-server-01"
            className="w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary" />
        </Field>

        <Field label="Engine">
          <div className="grid grid-cols-2 gap-3">
            {(["lxc", "vm"] as const).map((t) => (
              <button type="button" key={t} onClick={() => setType(t)}
                className={`rounded-lg border p-4 text-left transition ${type === t ? "border-primary bg-primary/10" : "border-border bg-background/40 hover:bg-secondary"}`}>
                <div className="text-2xl"><span className="emoji-anim">{t === "vm" ? "🖥️" : "📦"}</span></div>
                <div className="pixel-font mt-2 font-bold uppercase">{t}</div>
                <div className="text-xs text-muted-foreground">{t === "lxc" ? "Lightweight container, instant boot" : "Full virtual machine, kernel isolation"}</div>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Operating System">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {OS_OPTIONS.map((o) => (
              <button type="button" key={o.v} onClick={() => setOs(o.v)}
                className={`flex items-center gap-2 rounded-md border p-2.5 text-left text-sm transition ${os === o.v ? "border-primary bg-primary/10" : "border-border bg-background/40 hover:bg-secondary"}`}>
                <span className="text-lg emoji-anim">{o.e}</span>
                <span className="truncate">{o.l}</span>
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-3 gap-4">
          <Field label="CPU cores">
            <input type="number" min={1} max={32} value={cpu} onChange={(e) => setCpu(+e.target.value)}
              className="w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary" />
          </Field>
          <Field label="RAM (MB)">
            <input type="number" min={256} step={256} value={ramMb} onChange={(e) => setRamMb(+e.target.value)}
              className="w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary" />
          </Field>
          <Field label="Disk (GB)">
            <input type="number" min={5} value={storage} onChange={(e) => setStorage(+e.target.value)}
              className="w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary" />
          </Field>
        </div>

        <Field label="Node">
          <select value={nodeId} onChange={(e) => setNodeId(e.target.value)}
            className="w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary">
            <option value="">Auto-select</option>
            {nodes.map((n: any) => (
              <option key={n.id} value={n.id}>
                {n.name} · {n.location} · {n.cpu_cores}c/{n.ram_gb}GB/{n.storage_gb}GB ({n.status})
              </option>
            ))}
          </select>
        </Field>

        <button disabled={submitting} className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
          <Rocket className="h-4 w-4" /> {submitting ? "Provisioning…" : "Deploy VPS"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}
