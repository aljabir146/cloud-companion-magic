import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to postgres_changes on a table and invalidate matching React-Query keys
 * whenever a change comes through.
 */
export function useRealtimeInvalidate(table: string, queryKeyPrefixes: (string | string[])[]) {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel(`rt-${table}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          for (const k of queryKeyPrefixes) {
            qc.invalidateQueries({ queryKey: Array.isArray(k) ? k : [k] });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);
}
