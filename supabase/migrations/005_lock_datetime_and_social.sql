-- ============================================================
-- 005 - Automatic prediction lock + social/chat helpers
-- ============================================================

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
      FROM tournament_config
      WHERE key = 'predictions_locked' AND value = 'true'
    )
    OR EXISTS (
      SELECT 1
      FROM tournament_config
      WHERE key = 'lock_datetime'
        AND value <> ''
        AND value::timestamptz <= now()
    );
$$;

GRANT EXECUTE ON FUNCTION public.predictions_are_locked() TO authenticated;

DROP POLICY IF EXISTS "Users can view own predictions before lock" ON match_predictions;
DROP POLICY IF EXISTS "Users can insert own predictions before lock" ON match_predictions;
DROP POLICY IF EXISTS "Users can update own predictions before lock" ON match_predictions;
DROP POLICY IF EXISTS "Users can delete own predictions before lock" ON match_predictions;

CREATE POLICY "Users can view predictions after lock or own before lock" ON match_predictions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.predictions_are_locked());

CREATE POLICY "Users can insert own predictions before lock datetime" ON match_predictions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND NOT public.predictions_are_locked());

CREATE POLICY "Users can update own predictions before lock datetime" ON match_predictions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND NOT public.predictions_are_locked())
  WITH CHECK (user_id = auth.uid() AND NOT public.predictions_are_locked());

CREATE POLICY "Users can delete own predictions before lock datetime" ON match_predictions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND NOT public.predictions_are_locked());

DROP POLICY IF EXISTS "Users can view own standings before lock" ON predicted_group_standings;
DROP POLICY IF EXISTS "Users can insert own standings before lock" ON predicted_group_standings;
DROP POLICY IF EXISTS "Users can update own standings before lock" ON predicted_group_standings;
DROP POLICY IF EXISTS "Users can delete own standings before lock" ON predicted_group_standings;

CREATE POLICY "Users can view standings after lock or own before lock" ON predicted_group_standings
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.predictions_are_locked());

CREATE POLICY "Users can insert own standings before lock datetime" ON predicted_group_standings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND NOT public.predictions_are_locked());

CREATE POLICY "Users can update own standings before lock datetime" ON predicted_group_standings
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND NOT public.predictions_are_locked())
  WITH CHECK (user_id = auth.uid() AND NOT public.predictions_are_locked());

CREATE POLICY "Users can delete own standings before lock datetime" ON predicted_group_standings
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND NOT public.predictions_are_locked());

DROP POLICY IF EXISTS "Users can view own award predictions" ON award_predictions;
DROP POLICY IF EXISTS "Users can insert own award predictions before lock" ON award_predictions;
DROP POLICY IF EXISTS "Users can update own award predictions before lock" ON award_predictions;

CREATE POLICY "Users can view awards after lock or own before lock" ON award_predictions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.predictions_are_locked());

CREATE POLICY "Users can insert own awards before lock datetime" ON award_predictions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND NOT public.predictions_are_locked());

CREATE POLICY "Users can update own awards before lock datetime" ON award_predictions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND NOT public.predictions_are_locked())
  WITH CHECK (user_id = auth.uid() AND NOT public.predictions_are_locked());

DROP POLICY IF EXISTS "Users can view own best third order before lock" ON predicted_best_third_order;
DROP POLICY IF EXISTS "Users can insert own best third order before lock" ON predicted_best_third_order;
DROP POLICY IF EXISTS "Users can update own best third order before lock" ON predicted_best_third_order;
DROP POLICY IF EXISTS "Users can delete own best third order before lock" ON predicted_best_third_order;

CREATE POLICY "Users can view best third order after lock or own before lock" ON predicted_best_third_order
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.predictions_are_locked());

CREATE POLICY "Users can insert own best third order before lock datetime" ON predicted_best_third_order
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND NOT public.predictions_are_locked());

CREATE POLICY "Users can update own best third order before lock datetime" ON predicted_best_third_order
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND NOT public.predictions_are_locked())
  WITH CHECK (user_id = auth.uid() AND NOT public.predictions_are_locked());

CREATE POLICY "Users can delete own best third order before lock datetime" ON predicted_best_third_order
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND NOT public.predictions_are_locked());

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payment_validated_by UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payment_note TEXT;

ALTER TABLE players ADD COLUMN IF NOT EXISTS shirt_number INTEGER;
ALTER TABLE players ADD COLUMN IF NOT EXISTS squad_source TEXT;

CREATE TABLE IF NOT EXISTS chat_message_mentions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, mentioned_user_id)
);

CREATE TABLE IF NOT EXISTS chat_message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('👍', '😂', '❤️', '👀', '🏆')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('mention')),
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE chat_message_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentions viewable by authenticated" ON chat_message_mentions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create mentions for own messages" ON chat_message_mentions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_messages
      WHERE id = message_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Reactions viewable by authenticated" ON chat_message_reactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can react as self" ON chat_message_reactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove own reactions" ON chat_message_reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can create mention notifications from own messages" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_user_id = auth.uid()
    AND type = 'mention'
    AND EXISTS (
      SELECT 1 FROM chat_messages
      WHERE id = message_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can mark own notifications read" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_chat_mentions_message ON chat_message_mentions(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_mentions_user ON chat_message_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_reactions_message ON chat_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read_at);

ALTER PUBLICATION supabase_realtime ADD TABLE chat_message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
