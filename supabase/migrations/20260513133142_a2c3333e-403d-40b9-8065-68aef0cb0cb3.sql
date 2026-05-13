
-- 1. Extend nodes
ALTER TABLE public.nodes
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS api_url text,
  ADD COLUMN IF NOT EXISTS verify_ssl boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS vps_capacity integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- 2. api_keys
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  label text NOT NULL,
  prefix text NOT NULL,
  key_hash text NOT NULL,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys owner select" ON public.api_keys
  FOR SELECT USING (auth.uid() = owner_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "api_keys owner insert" ON public.api_keys
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "api_keys owner update" ON public.api_keys
  FOR UPDATE USING (auth.uid() = owner_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "api_keys owner delete" ON public.api_keys
  FOR DELETE USING (auth.uid() = owner_id OR has_role(auth.uid(),'admin'));

-- 3. backups
CREATE TABLE IF NOT EXISTS public.backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vps_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  label text NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  size_mb integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "backups owner select" ON public.backups
  FOR SELECT USING (auth.uid() = owner_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "backups owner insert" ON public.backups
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "backups owner delete" ON public.backups
  FOR DELETE USING (auth.uid() = owner_id OR has_role(auth.uid(),'admin'));

-- 4. backup_schedules
CREATE TABLE IF NOT EXISTS public.backup_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vps_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  cadence text NOT NULL DEFAULT 'daily',
  enabled boolean NOT NULL DEFAULT true,
  next_run_at timestamptz NOT NULL DEFAULT (now() + interval '1 day'),
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.backup_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sched owner select" ON public.backup_schedules
  FOR SELECT USING (auth.uid() = owner_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "sched owner insert" ON public.backup_schedules
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "sched owner update" ON public.backup_schedules
  FOR UPDATE USING (auth.uid() = owner_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "sched owner delete" ON public.backup_schedules
  FOR DELETE USING (auth.uid() = owner_id OR has_role(auth.uid(),'admin'));

-- 5. realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.vps;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vps_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.backups;

ALTER TABLE public.vps REPLICA IDENTITY FULL;
ALTER TABLE public.vps_logs REPLICA IDENTITY FULL;
ALTER TABLE public.nodes REPLICA IDENTITY FULL;
ALTER TABLE public.backups REPLICA IDENTITY FULL;
