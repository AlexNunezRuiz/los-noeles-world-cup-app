-- 021 - Clear existing chat messages and stop preserving chat-backed notification copies

DO $$
BEGIN
  IF to_regclass('public.notifications') IS NOT NULL THEN
    UPDATE public.notifications
    SET message_id = NULL
    WHERE message_id IS NOT NULL
      AND type <> 'mention';

    DELETE FROM public.notifications
    WHERE type = 'mention';
  END IF;

  IF to_regclass('public.chat_message_reactions') IS NOT NULL THEN
    DELETE FROM public.chat_message_reactions;
  END IF;

  IF to_regclass('public.chat_message_mentions') IS NOT NULL THEN
    DELETE FROM public.chat_message_mentions;
  END IF;

  IF to_regclass('public.chat_messages') IS NOT NULL THEN
    DELETE FROM public.chat_messages;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
