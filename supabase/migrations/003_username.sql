-- ============================================================
-- 003 - Usuario en profiles + login por usuario o email
-- ============================================================

-- Columna de usuario (única; las cuentas antiguas la tendrán NULL).
ALTER TABLE profiles ADD COLUMN username TEXT UNIQUE;

-- El trigger de alta guarda también el username de los metadatos del registro.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'username'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recupera las cuentas creadas con email sintético (@noeles.app): su usuario
-- es la parte local del correo.
UPDATE profiles
  SET username = split_part(email, '@', 1)
  WHERE email LIKE '%@noeles.app' AND username IS NULL;

-- RPC para resolver el email de login a partir del usuario. SECURITY DEFINER
-- porque al iniciar sesión el usuario aún no está autenticado y la RLS de
-- profiles bloquea la lectura anónima.
CREATE OR REPLACE FUNCTION public.email_for_username(p_username TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM profiles WHERE username = lower(p_username) LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.email_for_username(TEXT) TO anon, authenticated;
