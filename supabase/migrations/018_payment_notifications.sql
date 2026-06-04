-- 018 - Payment status notifications

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  title TEXT,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS link TEXT;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = to_regclass('public.notifications')
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
    'config_update',
    'payment_update'
  ));

CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON public.notifications(user_id, read_at);

CREATE INDEX IF NOT EXISTS idx_notifications_created
  ON public.notifications(user_id, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'Users can view own notifications'
  ) THEN
    CREATE POLICY "Users can view own notifications" ON public.notifications
      FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'Users can create mention notifications from own messages'
  ) THEN
    CREATE POLICY "Users can create mention notifications from own messages" ON public.notifications
      FOR INSERT TO authenticated
      WITH CHECK (
        actor_user_id = auth.uid()
        AND type = 'mention'
        AND EXISTS (
          SELECT 1 FROM public.chat_messages
          WHERE id = message_id AND user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'Users can mark own notifications read'
  ) THEN
    CREATE POLICY "Users can mark own notifications read" ON public.notifications
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DROP POLICY IF EXISTS "Admins can create global internal notifications" ON public.notifications;

CREATE POLICY "Admins can create global internal notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_user_id = auth.uid()
    AND type IN ('result_update', 'ranking_update', 'correct_prediction', 'config_update', 'payment_update')
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'notifications'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
