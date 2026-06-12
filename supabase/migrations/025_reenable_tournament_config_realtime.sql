-- 025 - Re-enable low-volume realtime updates for prediction lock config.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'tournament_config'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_config;
  END IF;
END
$$;
