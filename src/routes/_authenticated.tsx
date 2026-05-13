import { createFileRoute, Outlet, Link, useRouter, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { MinecraftBackground } from "@/components/MinecraftBackground";
import {
  LayoutDashboard, Server, Network, User, Bell, Cog, ScrollText, HardDrive,
  Crown, LogOut, Menu, X, Wrench, Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [user, loading, nav]);

  if (loading || !user) {
    return (
      <div className="relative grid min-h-screen place-items-center">
        <MinecraftBackground />
        <div className="glass rounded-xl p-6 text-sm text-muted-foreground">Loading <span className="emoji-anim">⛏️</span></div>
      </div>
    );
  }

  const groups: { label: string; items: { to: string; icon: typeof Server; label: string; adminOnly?: boolean; emoji?: string }[] }[] = [
    {
      label: "Main",
      items: [
        { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", emoji: "📊" },
        { to: "/vps", icon: Server, label: "My VPS", emoji: "💻" },
        { to: "/port-forwards", icon: Network, label: "Port Forwarding", emoji: "🔀" },
        { to: "/backups", icon: HardDrive, label: "Backups", emoji: "💾" },
        { to: "/api-keys", icon: Wrench, label: "API Keys", emoji: "🔑" },
      ],
    },
    {
      label: "Account",
      items: [
        { to: "/profile", icon: User, label: "Profile", emoji: "🙂" },
        { to: "/notifications", icon: Bell, label: "Notifications", emoji: "🔔" },
      ],
    },
    {
      label: "Administration",
      items: [
        { to: "/admin", icon: Crown, label: "Admin Panel", adminOnly: true, emoji: "👑" },
        { to: "/nodes", icon: HardDrive, label: "Nodes", adminOnly: true, emoji: "🗄️" },
      ],
    },
  ];

  return (
    <div className="relative min-h-screen">
      <MinecraftBackground dim={0.65} />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl transition-transform",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <Link to="/dashboard" className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-gradient-to-br from-primary to-accent text-xl shadow">
            <span className="emoji-anim">🐯</span>
          </div>
          <div>
            <div className="pixel-font text-sm font-bold">TigerHost</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">VM Panel</div>
          </div>
        </Link>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {groups.map((g) => {
            const items = g.items.filter((i) => !i.adminOnly || isAdmin);
            if (!items.length) return null;
            return (
              <div key={g.label} className="mb-5">
                <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{g.label}</div>
                <ul className="space-y-0.5">
                  {items.map((i) => {
                    const active = loc.pathname === i.to || loc.pathname.startsWith(i.to + "/");
                    return (
                      <li key={i.to}>
                        <Link
                          to={i.to}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition",
                            active
                              ? "bg-primary/15 text-primary shadow-inner"
                              : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                          )}
                        >
                          <span className="text-base">{i.emoji}</span>
                          <span className="flex-1">{i.label}</span>
                          {active && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <button onClick={async () => { await signOut(); nav({ to: "/" }); }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-destructive/15 hover:text-destructive">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Topbar (mobile) */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border/40 bg-background/60 px-4 py-3 backdrop-blur md:ml-64 md:px-8">
        <button className="md:hidden" onClick={() => setOpen((v) => !v)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="hidden text-sm text-muted-foreground md:block">
          {loc.pathname.replace("/", "").replaceAll("/", " · ") || "Dashboard"}
        </div>
        <div className="flex items-center gap-3">
          <Link to="/notifications" className="relative rounded-md p-2 hover:bg-secondary">
            <Bell className="h-4 w-4" />
          </Link>
          <Link to="/profile" className="flex items-center gap-2 rounded-md border border-border bg-card/50 px-2 py-1.5 text-xs">
            <div className="grid h-6 w-6 place-items-center rounded bg-gradient-to-br from-primary to-accent text-[10px] font-bold text-primary-foreground">
              {(user.email?.[0] || "?").toUpperCase()}
            </div>
            <div className="hidden md:block">
              <div className="font-semibold">{user.email?.split("@")[0]}</div>
              <div className="text-[10px] text-muted-foreground">{isAdmin ? "Admin" : "User"}</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Main */}
      <main className="md:ml-64 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-7xl animate-fade-up">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
