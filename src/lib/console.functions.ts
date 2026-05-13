import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { StartSchema, ExecSchema, mockExec, execOnRemote } from "./console.server";

export const startConsoleSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => StartSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: row, error } = await supabase
      .from("console_sessions")
      .insert({
        owner_id: userId,
        host: data.host,
        port: data.port,
        username: data.username,
        node_id: data.nodeId ?? null,
        vps_id: data.vpsId ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { sessionId: row.id as string };
  });

export const consoleExec = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ExecSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const result = data.nodeId
      ? await execOnRemote({
          nodeId: data.nodeId,
          host: data.host, port: data.port, username: data.username,
          password: data.password, command: data.command,
        })
      : mockExec(data.host, data.port, data.username, data.command);

    if (result.output !== "__CLEAR__") {
      await supabase.from("console_session_logs").insert({
        session_id: data.sessionId,
        owner_id: userId,
        command: data.command,
        output: result.output.slice(0, 16000),
        ok: result.ok,
        exit_code: result.exit_code ?? null,
      });
    }
    return result;
  });
