import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  component: Profile,
  head: () => ({ meta: [{ title: "Profile — TigerHost" }] }),
});

function Profile() {
  const { user, isAdmin } = useAuth();
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
      setUsername(data?.username ?? "");
      setFullName(data?.full_name ?? "");
    });
  }, [user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({ id: user.id, username, full_name: fullName });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="pixel-font text-2xl font-bold">Profile <span className="emoji-anim">🙂</span></h1>
        <p className="text-sm text-muted-foreground">Manage your account details.</p>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-2xl font-bold text-primary-foreground">
            {(user?.email?.[0] || "?").toUpperCase()}
          </div>
          <div>
            <div className="pixel-font font-bold">{user?.email}</div>
            <div className="text-xs text-muted-foreground">{isAdmin ? "👑 Admin" : "User"}</div>
          </div>
        </div>
        <form onSubmit={save} className="space-y-4">
          <Field label="Username">
            <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus:border-primary outline-none" />
          </Field>
          <Field label="Full name">
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus:border-primary outline-none" />
          </Field>
          <button disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}
