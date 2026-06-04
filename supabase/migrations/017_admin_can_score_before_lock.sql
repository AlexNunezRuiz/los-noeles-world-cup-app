-- 017 - Allow admins to recalculate scores before the prediction lock.
--
-- Public users still cannot inspect other players' picks before lock_datetime.
-- Admins need read access to every prediction table so the ranking can be
-- recalculated immediately after each real result is saved.

CREATE OR REPLACE FUNCTION public.predictions_are_locked()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.tournament_config
      WHERE key = 'predictions_locked' AND value = 'true'
    )
    OR EXISTS (
      SELECT 1
      FROM public.tournament_config
      WHERE key = 'lock_datetime'
        AND value <> ''
        AND value::timestamptz <= now()
    );
$$;

GRANT EXECUTE ON FUNCTION public.predictions_are_locked() TO authenticated;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_admin = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;

CREATE TABLE IF NOT EXISTS public.predicted_best_third_order (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES public.teams(id),
  rank INTEGER NOT NULL CHECK (rank BETWEEN 1 AND 12),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, team_id),
  UNIQUE(user_id, rank)
);

CREATE INDEX IF NOT EXISTS idx_predicted_best_third_order_user
  ON public.predicted_best_third_order(user_id);

ALTER TABLE public.predicted_best_third_order ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view predictions after lock or own before lock" ON public.match_predictions;
CREATE POLICY "Users can view predictions after lock or own before lock" ON public.match_predictions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.predictions_are_locked()
    OR public.current_user_is_admin()
  );

DROP POLICY IF EXISTS "Users can view standings after lock or own before lock" ON public.predicted_group_standings;
CREATE POLICY "Users can view standings after lock or own before lock" ON public.predicted_group_standings
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.predictions_are_locked()
    OR public.current_user_is_admin()
  );

DROP POLICY IF EXISTS "Users can view awards after lock or own before lock" ON public.award_predictions;
CREATE POLICY "Users can view awards after lock or own before lock" ON public.award_predictions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.predictions_are_locked()
    OR public.current_user_is_admin()
  );

DROP POLICY IF EXISTS "Users can view best third order after lock or own before lock" ON public.predicted_best_third_order;
CREATE POLICY "Users can view best third order after lock or own before lock" ON public.predicted_best_third_order
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.predictions_are_locked()
    OR public.current_user_is_admin()
  );

DROP POLICY IF EXISTS "Users can insert best third order before lock datetime" ON public.predicted_best_third_order;
CREATE POLICY "Users can insert best third order before lock datetime" ON public.predicted_best_third_order
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND NOT public.predictions_are_locked());

DROP POLICY IF EXISTS "Users can update best third order before lock datetime" ON public.predicted_best_third_order;
CREATE POLICY "Users can update best third order before lock datetime" ON public.predicted_best_third_order
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND NOT public.predictions_are_locked())
  WITH CHECK (user_id = auth.uid() AND NOT public.predictions_are_locked());

DROP POLICY IF EXISTS "Users can delete best third order before lock datetime" ON public.predicted_best_third_order;
CREATE POLICY "Users can delete best third order before lock datetime" ON public.predicted_best_third_order
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND NOT public.predictions_are_locked());
