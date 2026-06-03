-- 014 - Ensure chat reactions exist in deployed databases

CREATE TABLE IF NOT EXISTS public.chat_message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.chat_message_reactions
  DROP CONSTRAINT IF EXISTS chat_message_reactions_emoji_check;

ALTER TABLE public.chat_message_reactions
  ADD CONSTRAINT chat_message_reactions_emoji_check
  CHECK (char_length(emoji) BETWEEN 1 AND 16);

CREATE INDEX IF NOT EXISTS idx_chat_reactions_message
  ON public.chat_message_reactions(message_id);

CREATE INDEX IF NOT EXISTS idx_chat_reactions_user_message
  ON public.chat_message_reactions(user_id, message_id);

GRANT SELECT, INSERT, DELETE ON public.chat_message_reactions TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chat_message_reactions'
      AND policyname = 'Reactions viewable by authenticated'
  ) THEN
    CREATE POLICY "Reactions viewable by authenticated" ON public.chat_message_reactions
      FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chat_message_reactions'
      AND policyname = 'Users can react as self'
  ) THEN
    CREATE POLICY "Users can react as self" ON public.chat_message_reactions
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chat_message_reactions'
      AND policyname = 'Users can remove own reactions'
  ) THEN
    CREATE POLICY "Users can remove own reactions" ON public.chat_message_reactions
      FOR DELETE TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reactions;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
