import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MinecraftBackground } from "@/components/MinecraftBackground";
import { toast } from "sonner";
import { LogIn } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Sign in — TigerHost" }] }),
});

function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    nav({ to: "/dashboard" });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <MinecraftBackground dim={0.6} />
      <div className="glass relative w-full max-w-md rounded-2xl p-8 animate-fade-up">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <span className="emoji-anim">🐯</span> TigerHost
        </Link>
        <h1 className="pixel-font text-3xl font-bold">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">Welcome back, operator.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="Email">
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary" />
          </Field>
          <Field label="Password">
            <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary" />
          </Field>
          <button disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
            <LogIn className="h-4 w-4" /> {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-muted-foreground">
          New here? <Link to="/register" className="text-primary hover:underline">Create account</Link>
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
