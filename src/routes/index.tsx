import { createFileRoute, Link } from "@tanstack/react-router";
import { MinecraftBackground } from "@/components/MinecraftBackground";
import { Server, Cpu, Network, Layers, ShieldCheck, Activity } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "TigerHost — High-Performance VPS & LXC Panel" },
      { name: "description", content: "Manage LXC containers and full VMs across a multi-node cluster. Real-time monitoring, port forwarding, and admin tooling." },
    ],
  }),
});

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <MinecraftBackground dim={0.55} />

      {/* Top nav */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-gradient-to-br from-primary to-accent text-2xl shadow-lg">
            <span className="emoji-anim">🐯</span>
          </div>
          <div className="leading-tight">
            <div className="pixel-font text-sm font-bold tracking-wide">TigerHost</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">VPS · LXC · VM</div>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#nodes" className="hover:text-foreground">Multi-Node</a>
          <a href="#stack" className="hover:text-foreground">Stack</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login" className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-secondary">Login</Link>
          <Link to="/register" className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Register</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-16 pb-24 md:pt-24">
        <div className="max-w-3xl animate-fade-up">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot" />
            v2 · multi-node cluster ready
          </div>
          <h1 className="pixel-font text-6xl font-normal leading-[0.95] md:text-8xl lg:text-9xl">
            High-Performance
            <br />
            <span className="text-gradient">VPS Management</span>
          </h1>
          <p className="mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
            Deploy and manage <strong className="text-foreground">LXC containers</strong> and <strong className="text-foreground">full VMs</strong> across a cluster.
            Real-time metrics, port forwarding, scheduled backups, and a polished admin panel — all in one place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="group inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:opacity-90">
              <span className="emoji-anim">🚀</span> Get Started
            </Link>
            <Link to="/login" className="inline-flex items-center gap-2 rounded-md border border-border bg-card/50 px-5 py-3 font-semibold backdrop-blur hover:bg-secondary">
              Sign In
            </Link>
          </div>

          <div className="mt-12 grid max-w-2xl grid-cols-3 gap-6">
            {[
              { v: "100%", l: "Open Source" },
              { v: "LXC + VM", l: "Hybrid Engine" },
              { v: "Multi-Node", l: "Cluster Ready" },
            ].map((s) => (
              <div key={s.l}>
                <div className="pixel-font text-2xl font-bold text-gradient md:text-3xl">{s.v}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <h2 className="pixel-font text-3xl font-bold md:text-4xl">Built for operators <span className="emoji-anim">⚡</span></h2>
        <p className="mt-2 max-w-xl text-muted-foreground">Everything you'd build yourself, already wired up.</p>
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            { i: Server, t: "LXC + VM hybrid", d: "Spin up lightweight containers or full virtual machines from the same UI." },
            { i: Layers, t: "Multi-node clustering", d: "Schedule workloads across hosts with live capacity reporting." },
            { i: Network, t: "Port forwarding", d: "External ↔ internal port maps per VPS, TCP / UDP, with one click." },
            { i: Activity, t: "Real-time monitoring", d: "CPU, RAM, disk, network — streamed from each node agent." },
            { i: ShieldCheck, t: "Roles & RLS", d: "Admin and user roles enforced at the database level." },
            { i: Cpu, t: "Mock + real engine", d: "Demo mode out of the box, plug your real LXC/Docker host via the agent API." },
          ].map((f) => (
            <div key={f.t} className="glass group rounded-xl p-6 transition hover:-translate-y-1">
              <f.i className="h-7 w-7 text-primary group-hover:text-accent" />
              <div className="mt-4 pixel-font font-semibold">{f.t}</div>
              <div className="mt-1.5 text-sm text-muted-foreground">{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
        <span className="emoji-anim">🔥</span> TigerHost · Crafted block by block
      </footer>
    </div>
  );
}
