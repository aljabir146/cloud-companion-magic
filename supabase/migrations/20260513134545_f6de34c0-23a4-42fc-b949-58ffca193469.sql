
-- Console sessions and per-line logs
CREATE TABLE IF NOT EXISTS public.console_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  host text NOT NULL,
  port integer NOT NULL DEFAULT 22,
  username text NOT NULL,
  node_id uuid,
  vps_id uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
ALTER TABLE public.console_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cs owner select" ON public.console_sessions FOR SELECT
  USING (auth.uid() = owner_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "cs owner insert" ON public.console_sessions FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "cs owner update" ON public.console_sessions FOR UPDATE
  USING (auth.uid() = owner_id OR has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.console_session_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.console_sessions(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  command text NOT NULL,
  output text NOT NULL DEFAULT '',
  ok boolean NOT NULL DEFAULT true,
  exit_code integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.console_session_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "csl owner select" ON public.console_session_logs FOR SELECT
  USING (auth.uid() = owner_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "csl owner insert" ON public.console_session_logs FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
CREATE INDEX IF NOT EXISTS csl_session_idx ON public.console_session_logs(session_id, created_at);

-- Panel logs channel (system-wide)
CREATE TABLE IF NOT EXISTS public.panel_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL DEFAULT 'INFO',
  source text NOT NULL DEFAULT 'hvm_panel',
  message text NOT NULL,
  node_id uuid,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.panel_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "panel logs read auth" ON public.panel_logs FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "panel logs admin insert" ON public.panel_logs FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS panel_logs_created_idx ON public.panel_logs(created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.panel_logs;
ALTER TABLE public.panel_logs REPLICA IDENTITY FULL;
