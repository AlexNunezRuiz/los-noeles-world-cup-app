-- 026 - Allow admins to exclude users from competition views.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE OR REPLACE FUNCTION public.prevent_non_admin_profile_privilege_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    IF
      NEW.id IS DISTINCT FROM OLD.id
      OR NEW.username IS DISTINCT FROM OLD.username
      OR NEW.email IS DISTINCT FROM OLD.email
      OR NEW.has_paid IS DISTINCT FROM OLD.has_paid
      OR NEW.is_admin IS DISTINCT FROM OLD.is_admin
      OR NEW.is_chat_banned IS DISTINCT FROM OLD.is_chat_banned
      OR NEW.is_active IS DISTINCT FROM OLD.is_active
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
      OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
      OR NEW.payment_validated_by IS DISTINCT FROM OLD.payment_validated_by
      OR NEW.payment_note IS DISTINCT FROM OLD.payment_note
      OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
      OR NEW.payment_reference IS DISTINCT FROM OLD.payment_reference
    THEN
      RAISE EXCEPTION 'Only admins can update protected profile fields'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
