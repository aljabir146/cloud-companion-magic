-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Nodes
CREATE TABLE public.nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  hostname TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT 'Default',
  status TEXT NOT NULL DEFAULT 'online',
  cpu_cores INTEGER NOT NULL DEFAULT 0,
  ram_gb INTEGER NOT NULL DEFAULT 0,
  storage_gb INTEGER NOT NULL DEFAULT 0,
  used_cpu INTEGER NOT NULL DEFAULT 0,
  used_ram INTEGER NOT NULL DEFAULT 0,
  used_storage INTEGER NOT NULL DEFAULT 0,
  agent_secret TEXT NOT NULL DEFAULT encode(gen_random_bytes(24),'hex'),
  last_heartbeat TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;

-- VPS
CREATE TABLE public.vps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  node_id UUID REFERENCES public.nodes(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'lxc',
  os TEXT NOT NULL DEFAULT 'ubuntu-22.04',
  cpu INTEGER NOT NULL DEFAULT 1,
  ram_mb INTEGER NOT NULL DEFAULT 1024,
  storage_gb INTEGER NOT NULL DEFAULT 20,
  status TEXT NOT NULL DEFAULT 'provisioning',
  ip_address TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vps ENABLE ROW LEVEL SECURITY;

-- Port forwards
CREATE TABLE public.port_forwards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vps_id UUID NOT NULL REFERENCES public.vps(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_port INTEGER NOT NULL,
  internal_port INTEGER NOT NULL,
  protocol TEXT NOT NULL DEFAULT 'tcp',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.port_forwards ENABLE ROW LEVEL SECURITY;

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- VPS logs
CREATE TABLE public.vps_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vps_id UUID NOT NULL REFERENCES public.vps(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vps_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- profiles
CREATE POLICY "profiles self select" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles self insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- user_roles
CREATE POLICY "roles self select" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles admin manage" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- nodes
CREATE POLICY "nodes select all signed in" ON public.nodes FOR SELECT TO authenticated USING (true);
CREATE POLICY "nodes admin manage" ON public.nodes FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- vps
CREATE POLICY "vps owner select" ON public.vps FOR SELECT USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "vps owner insert" ON public.vps FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "vps owner update" ON public.vps FOR UPDATE USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "vps owner delete" ON public.vps FOR DELETE USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));

-- port_forwards
CREATE POLICY "pf owner select" ON public.port_forwards FOR SELECT USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "pf owner insert" ON public.port_forwards FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "pf owner update" ON public.port_forwards FOR UPDATE USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "pf owner delete" ON public.port_forwards FOR DELETE USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));

-- notifications
CREATE POLICY "notif self select" ON public.notifications FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "notif self update" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notif admin insert" ON public.notifications FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin') OR auth.uid() = user_id);

-- vps_logs (read via vps ownership)
CREATE POLICY "logs select via vps" ON public.vps_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.vps v WHERE v.id = vps_logs.vps_id AND (v.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
);

-- Trigger: auto profile + role on signup; first signup becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_count INT;
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1)), COALESCE(NEW.raw_user_meta_data->>'full_name',''));
  
  SELECT count(*) INTO user_count FROM auth.users;
  IF user_count <= 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed a demo node
INSERT INTO public.nodes (name, hostname, location, cpu_cores, ram_gb, storage_gb, status)
VALUES ('node-01', 'node01.tigerhost.local', 'Mumbai, IN', 32, 128, 2000, 'online');