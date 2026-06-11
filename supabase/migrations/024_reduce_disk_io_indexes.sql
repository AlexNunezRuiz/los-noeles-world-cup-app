-- 024 - Reduce avoidable Disk IO from common app reads

-- Chat loads the latest visible messages and navbar checks unread messages.
CREATE INDEX IF NOT EXISTS idx_chat_messages_visible_created
  ON public.chat_messages(created_at DESC)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_chat_messages_visible_user_created
  ON public.chat_messages(user_id, created_at DESC)
  WHERE is_deleted = false;

-- Bote counts paid profiles frequently.
CREATE INDEX IF NOT EXISTS idx_profiles_has_paid_true
  ON public.profiles(has_paid)
  WHERE has_paid = true;

-- Admin/player screens sort and search by player name, and FK joins use team_id.
CREATE INDEX IF NOT EXISTS idx_players_name
  ON public.players(name);

-- Foreign-key support indexes that are not covered by existing indexes.
CREATE INDEX IF NOT EXISTS idx_knockout_bracket_positions_match_number
  ON public.knockout_bracket_positions(match_number);

CREATE INDEX IF NOT EXISTS idx_actual_awards_player
  ON public.actual_awards(player_id)
  WHERE player_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_score_events_match
  ON public.score_events(match_id)
  WHERE match_id IS NOT NULL;
