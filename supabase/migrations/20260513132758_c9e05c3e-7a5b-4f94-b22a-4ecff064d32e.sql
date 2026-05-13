CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE uname text;
BEGIN
  uname := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1));
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (NEW.id, uname, COALESCE(NEW.raw_user_meta_data->>'full_name',''));

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  IF lower(uname) = 'jabir' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Promote any existing user named 'jabir' to admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM public.profiles WHERE lower(username) = 'jabir'
ON CONFLICT DO NOTHING;