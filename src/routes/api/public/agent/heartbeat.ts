import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Public agent endpoint — node agents POST heartbeats and status updates here.
 *
 * Auth: HMAC-SHA256 of the raw body using the node's `agent_secret`,
 * sent in `x-agent-signature`. Node id sent in `x-node-id`.
 *
 * Body shape:
 *   {
 *     used_cpu, used_ram, used_storage,           // capacity report
 *     vps?: [{ id, status, ip_address? }]         // optional vps state updates
 *   }
 *
 * To wire this to a real LXC/Docker host:
 *   1. Create a node in /nodes (admin), copy its agent_secret.
 *   2. Run a small script on the host that polls `lxc list` / `docker ps`,
 *      computes used cpu/ram/disk, signs the JSON with HMAC, and POSTs here
 *      every ~30s.
 */

const Body = z.object({
  used_cpu: z.number().int().min(0).max(99999).optional(),
  used_ram: z.number().int().min(0).max(99999).optional(),
  used_storage: z.number().int().min(0).max(999999).optional(),
  vps: z.array(z.object({
    id: z.string().uuid(),
    status: z.enum(["running", "stopped", "suspended", "error", "provisioning"]),
    ip_address: z.string().max(64).optional(),
  })).max(500).optional(),
});

export const Route = createFileRoute("/api/public/agent/heartbeat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const nodeId = request.headers.get("x-node-id");
        const sig = request.headers.get("x-agent-signature");
        const raw = await request.text();

        if (!nodeId || !sig) return new Response("Missing headers", { status: 401 });

        const { data: node, error: nErr } = await supabaseAdmin
          .from("nodes").select("id, agent_secret").eq("id", nodeId).maybeSingle();
        if (nErr || !node) return new Response("Unknown node", { status: 401 });

        const expected = createHmac("sha256", node.agent_secret).update(raw).digest("hex");
        try {
          if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
            return new Response("Bad signature", { status: 401 });
          }
        } catch {
          return new Response("Bad signature", { status: 401 });
        }

        let parsed;
        try { parsed = Body.parse(JSON.parse(raw)); }
        catch { return new Response("Invalid body", { status: 400 }); }

        const update: Record<string, any> = { last_heartbeat: new Date().toISOString(), status: "online" };
        if (parsed.used_cpu !== undefined) update.used_cpu = parsed.used_cpu;
        if (parsed.used_ram !== undefined) update.used_ram = parsed.used_ram;
        if (parsed.used_storage !== undefined) update.used_storage = parsed.used_storage;
        await supabaseAdmin.from("nodes").update(update).eq("id", node.id);

        if (parsed.vps?.length) {
          for (const v of parsed.vps) {
            const u: Record<string, any> = { status: v.status };
            if (v.ip_address) u.ip_address = v.ip_address;
            await supabaseAdmin.from("vps").update(u).eq("id", v.id).eq("node_id", node.id);
          }
        }

        return Response.json({ ok: true });
      },
    },
  },
});
