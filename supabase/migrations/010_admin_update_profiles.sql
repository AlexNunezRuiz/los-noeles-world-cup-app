-- 010 - Allow admins to update profiles and ensure payment metadata exists

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_validated_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_note TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_reference TEXT;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_admin = true
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_is_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Admins can update profiles'
  ) THEN
    CREATE POLICY "Admins can update profiles" ON public.profiles
      FOR UPDATE TO authenticated
      USING (public.current_user_is_admin())
      WITH CHECK (public.current_user_is_admin());
  END IF;
END
$$;

NOTIFY pgrst, 'reload schema';
