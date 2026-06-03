-- 015 - Internal notification types and display fields

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS link TEXT;

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.notifications'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%type%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.notifications DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'mention',
    'admin_update',
    'result_update',
    'ranking_update',
    'correct_prediction',
    'config_update'
  ));

CREATE INDEX IF NOT EXISTS idx_notifications_created
  ON public.notifications(user_id, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'Admins can create global internal notifications'
  ) THEN
    CREATE POLICY "Admins can create global internal notifications" ON public.notifications
      FOR INSERT TO authenticated
      WITH CHECK (
        actor_user_id = auth.uid()
        AND type IN ('result_update', 'ranking_update', 'correct_prediction', 'config_update')
        AND EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND is_admin = true
        )
      );
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
