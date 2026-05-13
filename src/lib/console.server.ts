import { z } from "zod";
import { createHmac } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const StartSchema = z.object({
  host: z.string().min(1).max(255),
  port: z.coerce.number().int().min(1).max(65535),
  username: z.string().min(1).max(64),
  nodeId: z.string().uuid().optional().nullable(),
  vpsId: z.string().uuid().optional().nullable(),
});

export const ExecSchema = z.object({
  sessionId: z.string().uuid(),
  host: z.string().min(1).max(255),
  port: z.coerce.number().int().min(1).max(65535),
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(256),
  command: z.string().min(1).max(2000),
  nodeId: z.string().uuid().optional().nullable(),
});

export type ExecResult = { ok: boolean; output: string; exit_code?: number };

export function mockExec(host: string, port: number, username: string, command: string): ExecResult {
  const ts = new Date().toISOString();
  const banner = `[${ts}] ${username}@${host}:${port} $ ${command}`;
  const lower = command.trim().toLowerCase();
  if (lower === "whoami") return { ok: true, output: `${banner}\n${username}` };
  if (lower === "hostname") return { ok: true, output: `${banner}\n${host}` };
  if (lower === "pwd") return { ok: true, output: `${banner}\n/home/${username}` };
  if (lower.startsWith("echo ")) return { ok: true, output: `${banner}\n${command.slice(5)}` };
  if (lower === "uptime") return { ok: true, output: `${banner}\n up 4 days, load average: 0.21, 0.18, 0.15` };
  if (lower === "uname -a") return { ok: true, output: `${banner}\nLinux ${host} 6.5.0-tigerhost #1 SMP x86_64 GNU/Linux` };
  if (lower === "ls" || lower === "ls -la") return { ok: true, output: `${banner}\nbin  etc  home  var  tmp  usr  opt` };
  if (lower === "free -h") return { ok: true, output: `${banner}\nMem:  2.0Gi   412Mi   1.4Gi\nSwap: 512Mi      0B   512Mi` };
  if (lower === "ps" || lower.startsWith("ps ")) return { ok: true, output: `${banner}\n  PID TTY          TIME CMD\n    1 ?        00:00:01 init\n   42 ?        00:00:00 sshd\n  100 ?        00:00:00 bash` };
  if (lower === "df -h") return { ok: true, output: `${banner}\nFilesystem      Size  Used Avail Use%\n/dev/root        20G  3.2G   17G  17%` };
  if (lower === "clear") return { ok: true, output: "__CLEAR__" };
  if (lower === "help") return { ok: true, output: `${banner}\nDemo console — commands: whoami, hostname, pwd, echo, uptime, uname -a, ls, free -h, df -h, ps, clear.\nAttach a remote node with an api_url + agent_secret to run real commands.` };
  return { ok: false, output: `${banner}\nbash: ${command.split(" ")[0]}: command not found (type 'help')` };
}

export async function execOnRemote(opts: {
  nodeId: string;
  host: string; port: number; username: string; password: string; command: string;
}): Promise<ExecResult> {
  const { data: node } = await supabaseAdmin
    .from("nodes")
    .select("api_url, agent_secret, kind")
    .eq("id", opts.nodeId)
    .maybeSingle();
  if (!node?.api_url || !node.agent_secret || node.kind !== "remote") {
    return mockExec(opts.host, opts.port, opts.username, opts.command);
  }
  try {
    const body = JSON.stringify({
      host: opts.host, port: opts.port, username: opts.username,
      password: opts.password, command: opts.command,
    });
    const sig = createHmac("sha256", node.agent_secret).update(body).digest("hex");
    const res = await fetch(`${node.api_url.replace(/\/+$/, "")}/exec`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Agent-Signature": sig },
      body,
    });
    const text = await res.text();
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch {}
    return parsed && typeof parsed.output === "string"
      ? { ok: !!parsed.ok, output: parsed.output, exit_code: parsed.exit_code }
      : { ok: res.ok, output: text };
  } catch (err: any) {
    return { ok: false, output: `agent error: ${err?.message || "unreachable"}` };
  }
}
