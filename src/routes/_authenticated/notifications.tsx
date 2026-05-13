import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Bell, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: Notifs,
  head: () => ({ meta: [{ title: "Notifications — TigerHost" }] }),
});

function Notifs() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await supabase.from("notifications").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  async function markAll() {
    await supabase.from("notifications").update({ read: true }).eq("user_id", user!.id).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="pixel-font text-2xl font-bold">Notifications <span className="emoji-anim">🔔</span></h1>
          <p className="text-sm text-muted-foreground">Latest activity from your infrastructure.</p>
        </div>
        <button onClick={markAll} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card/50 px-3 py-1.5 text-xs hover:bg-secondary"><Check className="h-3 w-3" /> Mark all read</button>
      </div>

      <div className="glass divide-y divide-border/50 rounded-xl">
        {items.length === 0 && (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <Bell className="mx-auto mb-2 h-6 w-6 opacity-50" /> Nothing here yet.
          </div>
        )}
        {items.map((n: any) => (
          <div key={n.id} className={`flex items-start gap-3 p-4 ${n.read ? "opacity-60" : ""}`}>
            <div className={`mt-1 h-2 w-2 rounded-full ${n.read ? "bg-muted" : "bg-primary pulse-dot"}`} />
            <div className="flex-1">
              <div className="text-sm font-semibold">{n.title}</div>
              <div className="text-xs text-muted-foreground">{n.message}</div>
            </div>
            <div className="text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
