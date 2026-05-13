import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ExecSchema = z.object({
  host: z.string().min(1).max(255),
  port: z.coerce.number().int().min(1).max(65535),
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(256),
  command: z.string().min(1).max(2000),
});

/**
 * Simulated SSH exec. The Worker SSR runtime cannot open raw SSH sockets,
 * so this returns a deterministic mock response. To go live, run the
 * node-agent (public/agent/node-agent.py) on the target host and POST the
 * command to its /exec endpoint over HTTPS.
 */
export const consoleExec = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ExecSchema.parse(input))
  .handler(async ({ data }) => {
    const { host, port, username, command } = data;
    const ts = new Date().toISOString();
    const lower = command.trim().toLowerCase();

    const banner = `[${ts}] ${username}@${host}:${port} $ ${command}`;

    if (lower === "whoami") return { ok: true, output: `${banner}\n${username}` };
    if (lower === "hostname") return { ok: true, output: `${banner}\n${host}` };
    if (lower === "pwd") return { ok: true, output: `${banner}\n/home/${username}` };
    if (lower.startsWith("echo ")) return { ok: true, output: `${banner}\n${command.slice(5)}` };
    if (lower === "uptime") return { ok: true, output: `${banner}\n up 4 days, load average: 0.21, 0.18, 0.15` };
    if (lower === "uname -a") return { ok: true, output: `${banner}\nLinux ${host} 6.5.0-tigerhost #1 SMP x86_64 GNU/Linux` };
    if (lower === "ls" || lower === "ls -la") {
      return {
        ok: true,
        output: `${banner}\ntotal 24\ndrwxr-xr-x 4 ${username} ${username} 4096 May 13 12:00 .\ndrwxr-xr-x 6 root      root      4096 May 13 11:00 ..\n-rw------- 1 ${username} ${username}   220 May 13 12:00 .bashrc\ndrwxr-xr-x 2 ${username} ${username} 4096 May 13 12:00 projects`,
      };
    }
    if (lower === "free -h") {
      return { ok: true, output: `${banner}\n              total        used        free\nMem:           2.0Gi       412Mi       1.4Gi\nSwap:          512Mi          0B       512Mi` };
    }
    if (lower === "clear") return { ok: true, output: "__CLEAR__" };
    if (lower === "help") {
      return { ok: true, output: `${banner}\nDemo console — supported: whoami, hostname, pwd, echo, uptime, uname -a, ls, free -h, clear.\nFor real shell access, install the TigerHost node-agent on the target host.` };
    }
    return {
      ok: false,
      output: `${banner}\nbash: ${command.split(" ")[0]}: command not found (demo console — type 'help')`,
    };
  });
