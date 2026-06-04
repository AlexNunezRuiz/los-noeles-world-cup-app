-- 020 - Admin-managed home messages

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.home_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link_label TEXT,
  link_href TEXT,
  tone TEXT NOT NULL DEFAULT 'info' CHECK (tone IN ('info', 'payment', 'warning', 'success')),
  is_published BOOLEAN NOT NULL DEFAULT true,
  is_pinned BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.home_messages ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_home_messages_updated_at ON public.home_messages;
CREATE TRIGGER set_home_messages_updated_at
  BEFORE UPDATE ON public.home_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_home_messages_visible
  ON public.home_messages(is_published, is_pinned, updated_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'home_messages'
      AND policyname = 'Published home messages viewable by authenticated users'
  ) THEN
    CREATE POLICY "Published home messages viewable by authenticated users" ON public.home_messages
      FOR SELECT TO authenticated
      USING (is_published = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'home_messages'
      AND policyname = 'Admins can manage home messages'
  ) THEN
    CREATE POLICY "Admins can manage home messages" ON public.home_messages
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND is_admin = true
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND is_admin = true
        )
      );
  END IF;
END $$;

INSERT INTO public.home_messages (slug, title, body, tone, is_published, is_pinned)
VALUES
  (
    'payment-info',
    'Pago de la porra',
    'Para validar tu participacion, revisa los datos de pago publicados por el administrador.',
    'payment',
    true,
    true
  ),
  (
    'install-info',
    'Instala la porra como app',
    'En el movil, abre el menu del navegador y toca "Anadir a pantalla de inicio". Asi tendras un acceso directo.',
    'info',
    true,
    true
  )
ON CONFLICT (slug) DO NOTHING;

DROP POLICY IF EXISTS "Admins can create global internal notifications" ON public.notifications;

CREATE POLICY "Admins can create global internal notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_user_id = auth.uid()
    AND type IN ('admin_update', 'result_update', 'ranking_update', 'correct_prediction', 'config_update', 'payment_update')
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
         AND tablename = 'home_messages'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.home_messages;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
