import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Plus, KeyRound, Trash2, Copy, Download, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/api-keys")({
  component: ApiKeysPage,
  head: () => ({ meta: [{ title: "API Keys — TigerHost" }] }),
});

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function ApiKeysPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [reveal, setReveal] = useState<string | null>(null);

  const { data: keys = [] } = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => (await supabase.from("api_keys").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("not signed in");
      const raw = "tgr_" + crypto.getRandomValues(new Uint8Array(24)).reduce((s, b) => s + b.toString(16).padStart(2, "0"), "");
      const prefix = raw.slice(0, 10);
      const key_hash = await sha256Hex(raw);
      const { error } = await supabase.from("api_keys").insert({ owner_id: user.id, label, prefix, key_hash });
      if (error) throw error;
      return raw;
    },
    onSuccess: (raw) => { setReveal(raw); setLabel(""); qc.invalidateQueries({ queryKey: ["api-keys"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  async function revoke(id: string) {
    if (!confirm("Revoke this key?")) return;
    await supabase.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["api-keys"] });
  }
  async function del(id: string) {
    if (!confirm("Delete this key permanently?")) return;
    await supabase.from("api_keys").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["api-keys"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="pixel-font text-3xl">API Keys <span className="emoji-anim">🔑</span></h1>
          <p className="text-sm text-muted-foreground">Personal tokens for the TigerHost panel REST API and node agents.</p>
        </div>
        <a href="/agent/node-agent.py" download className="inline-flex items-center gap-2 rounded-md border border-border bg-card/50 px-3 py-2 text-xs hover:bg-card">
          <Download className="h-4 w-4" /> Download node-agent.py
        </a>
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="mb-3 flex items-center gap-2 pixel-font text-lg">
          <Plus className="h-5 w-5 text-primary" /> Create new key
        </div>
        <div className="flex flex-wrap gap-2">
          <input placeholder="e.g., CI deploy bot" value={label} onChange={(e) => setLabel(e.target.value)}
            className="flex-1 rounded-md border border-input bg-background/50 px-3 py-2 text-sm" />
          <button disabled={!label || create.isPending} onClick={() => create.mutate()}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            <KeyRound className="h-4 w-4" /> {create.isPending ? "Generating…" : "Generate"}
          </button>
        </div>

        {reveal && (
          <div className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-4">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 text-warning" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-warning">Copy this key now — you will not see it again.</div>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 break-all rounded bg-background/80 p-2 font-mono text-xs">{reveal}</code>
                  <button onClick={() => { navigator.clipboard.writeText(reveal); toast.success("Copied"); }}
                    className="rounded-md border border-border bg-secondary px-2 py-1.5 text-xs hover:bg-secondary/70">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button onClick={() => setReveal(null)} className="mt-3 text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="glass overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Label</th>
              <th className="p-3 text-left">Prefix</th>
              <th className="p-3 text-left">Created</th>
              <th className="p-3 text-left">Last used</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No keys yet — generate your first one above.</td></tr>
            )}
            {keys.map((k: any) => (
              <tr key={k.id} className="border-t border-border hover:bg-secondary/20">
                <td className="p-3 font-semibold">{k.label}</td>
                <td className="p-3 font-mono text-xs text-muted-foreground">{k.prefix}…</td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(k.created_at).toLocaleDateString()}</td>
                <td className="p-3 text-xs text-muted-foreground">{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "—"}</td>
                <td className="p-3">
                  {k.revoked_at
                    ? <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive">Revoked</span>
                    : <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">● Active</span>}
                </td>
                <td className="p-3 text-right">
                  {!k.revoked_at && <button onClick={() => revoke(k.id)} className="mr-2 text-xs text-warning hover:underline">Revoke</button>}
                  <button onClick={() => del(k.id)} className="text-destructive hover:opacity-80"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
