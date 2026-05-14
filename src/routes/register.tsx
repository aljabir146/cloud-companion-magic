import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MinecraftBackground } from "@/components/MinecraftBackground";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
  head: () => ({ meta: [{ title: "Create account — TigerHost" }] }),
});

function RegisterPage() {
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const uname = username.trim().toLowerCase();
      if (!/^[a-z0-9_-]{2,32}$/.test(uname)) throw new Error("Username must be 2-32 chars: letters, numbers, _ or -");
      // Pre-check username availability
      const { data: taken } = await supabase.rpc("lookup_email_by_username", { _username: uname });
      if (taken) throw new Error("That username is already taken");

      const redirectUrl = `${window.location.origin}/dashboard`;
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: redirectUrl, data: { username: uname } },
      });
      if (error) {
        const msg = /registered|exists|already/i.test(error.message)
          ? "That email already has an account — try signing in."
          : error.message;
        throw new Error(msg);
      }
      toast.success("Account created — welcome!");
      nav({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err?.message || "Sign-up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <MinecraftBackground dim={0.6} />
      <div className="glass relative w-full max-w-md rounded-2xl p-8 animate-fade-up">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <span className="emoji-anim">🐯</span> TigerHost
        </Link>
        <h1 className="pixel-font text-4xl">Create account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pick a username and join the cluster <span className="emoji-anim">🔥</span></p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="Username">
            <input required value={username} onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary" />
          </Field>
          <Field label="Email">
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary" />
          </Field>
          <Field label="Password">
            <input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary" />
          </Field>
          <button disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
            <UserPlus className="h-4 w-4" /> {loading ? "Creating…" : "Create account"}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already have one? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
        </div>
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
