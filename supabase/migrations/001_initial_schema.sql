-- ============================================================
-- Porra del Mundial 2026 - Schema completo
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  has_paid BOOLEAN NOT NULL DEFAULT FALSE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_chat_banned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TEAMS (48 equipos del Mundial 2026)
-- ============================================================
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  flag_emoji TEXT NOT NULL DEFAULT '',
  group_letter CHAR(1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PLAYERS (para premios individuales)
-- ============================================================
CREATE TABLE players (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  team_id INTEGER REFERENCES teams(id),
  position TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MATCHES (104 partidos)
-- ============================================================
CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  match_number INTEGER NOT NULL UNIQUE,
  stage TEXT NOT NULL CHECK (stage IN ('group', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final')),
  group_letter CHAR(1),
  home_team_id INTEGER REFERENCES teams(id),
  away_team_id INTEGER REFERENCES teams(id),
  home_placeholder TEXT,
  away_placeholder TEXT,
  match_date TIMESTAMPTZ,
  venue TEXT,
  home_score INTEGER,
  away_score INTEGER,
  penalty_winner_team_id INTEGER REFERENCES teams(id),
  is_finished BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- KNOCKOUT BRACKET POSITIONS
-- ============================================================
CREATE TABLE knockout_bracket_positions (
  id SERIAL PRIMARY KEY,
  match_number INTEGER NOT NULL REFERENCES matches(match_number),
  slot TEXT NOT NULL CHECK (slot IN ('home', 'away')),
  source_type TEXT NOT NULL CHECK (source_type IN ('group_winner', 'group_runner_up', 'best_third', 'match_winner', 'match_loser')),
  source_group CHAR(1),
  source_match_number INTEGER,
  best_third_pool TEXT,
  description TEXT
);

-- ============================================================
-- MATCH PREDICTIONS
-- ============================================================
CREATE TABLE match_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_id INTEGER NOT NULL REFERENCES matches(id),
  home_score INTEGER NOT NULL DEFAULT 0,
  away_score INTEGER NOT NULL DEFAULT 0,
  penalty_winner TEXT CHECK (penalty_winner IN ('home', 'away')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, match_id)
);

-- ============================================================
-- PREDICTED GROUP STANDINGS
-- ============================================================
CREATE TABLE predicted_group_standings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_letter CHAR(1) NOT NULL,
  team_id INTEGER NOT NULL REFERENCES teams(id),
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 4),
  points INTEGER NOT NULL DEFAULT 0,
  goal_difference INTEGER NOT NULL DEFAULT 0,
  goals_for INTEGER NOT NULL DEFAULT 0,
  goals_against INTEGER NOT NULL DEFAULT 0,
  is_manual_override BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, group_letter, team_id),
  UNIQUE(user_id, group_letter, position)
);

-- ============================================================
-- AWARD PREDICTIONS
-- ============================================================
CREATE TABLE award_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  award_type TEXT NOT NULL CHECK (award_type IN ('golden_boot', 'golden_ball', 'golden_glove')),
  player_id INTEGER REFERENCES players(id),
  player_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, award_type)
);

-- ============================================================
-- ACTUAL AWARDS (admin sets these)
-- ============================================================
CREATE TABLE actual_awards (
  id SERIAL PRIMARY KEY,
  award_type TEXT NOT NULL UNIQUE CHECK (award_type IN ('golden_boot', 'golden_ball', 'golden_glove')),
  player_id INTEGER REFERENCES players(id),
  player_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SCORING RULES
-- ============================================================
CREATE TABLE scoring_rules (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  rule_key TEXT NOT NULL UNIQUE,
  points INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- USER SCORES (cache)
-- ============================================================
CREATE TABLE user_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  group_stage_points INTEGER NOT NULL DEFAULT 0,
  knockout_exact_points INTEGER NOT NULL DEFAULT 0,
  qualification_points INTEGER NOT NULL DEFAULT 0,
  award_points INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SCORE EVENTS (detailed log)
-- ============================================================
CREATE TABLE score_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_id INTEGER REFERENCES matches(id),
  rule_key TEXT NOT NULL,
  points INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CHAT MESSAGES
-- ============================================================
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TOURNAMENT CONFIG
-- ============================================================
CREATE TABLE tournament_config (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_matches_stage ON matches(stage);
CREATE INDEX idx_matches_group ON matches(group_letter);
CREATE INDEX idx_match_predictions_user ON match_predictions(user_id);
CREATE INDEX idx_match_predictions_match ON match_predictions(match_id);
CREATE INDEX idx_predicted_group_standings_user ON predicted_group_standings(user_id);
CREATE INDEX idx_predicted_group_standings_group ON predicted_group_standings(group_letter);
CREATE INDEX idx_score_events_user ON score_events(user_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX idx_teams_group ON teams(group_letter);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE knockout_bracket_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE predicted_group_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE award_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE actual_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_config ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Profiles are viewable by authenticated users" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- TEAMS (read-only for everyone)
CREATE POLICY "Teams are viewable by everyone" ON teams
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can manage teams" ON teams
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- PLAYERS
CREATE POLICY "Players are viewable by authenticated" ON players
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can manage players" ON players
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- MATCHES
CREATE POLICY "Matches are viewable by authenticated" ON matches
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can update matches" ON matches
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- KNOCKOUT BRACKET POSITIONS
CREATE POLICY "Bracket positions viewable by authenticated" ON knockout_bracket_positions
  FOR SELECT TO authenticated USING (true);

-- MATCH PREDICTIONS
CREATE POLICY "Users can view own predictions before lock" ON match_predictions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tournament_config
      WHERE key = 'predictions_locked' AND value = 'true'
    )
  );

CREATE POLICY "Users can insert own predictions before lock" ON match_predictions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM tournament_config
      WHERE key = 'predictions_locked' AND value = 'true'
    )
  );

CREATE POLICY "Users can update own predictions before lock" ON match_predictions
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM tournament_config
      WHERE key = 'predictions_locked' AND value = 'true'
    )
  );

CREATE POLICY "Users can delete own predictions before lock" ON match_predictions
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM tournament_config
      WHERE key = 'predictions_locked' AND value = 'true'
    )
  );

-- PREDICTED GROUP STANDINGS
CREATE POLICY "Users can view own standings before lock" ON predicted_group_standings
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tournament_config
      WHERE key = 'predictions_locked' AND value = 'true'
    )
  );

CREATE POLICY "Users can insert own standings before lock" ON predicted_group_standings
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM tournament_config
      WHERE key = 'predictions_locked' AND value = 'true'
    )
  );

CREATE POLICY "Users can update own standings before lock" ON predicted_group_standings
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM tournament_config
      WHERE key = 'predictions_locked' AND value = 'true'
    )
  );

CREATE POLICY "Users can delete own standings before lock" ON predicted_group_standings
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM tournament_config
      WHERE key = 'predictions_locked' AND value = 'true'
    )
  );

-- AWARD PREDICTIONS
CREATE POLICY "Users can view own award predictions" ON award_predictions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tournament_config
      WHERE key = 'predictions_locked' AND value = 'true'
    )
  );

CREATE POLICY "Users can insert own award predictions before lock" ON award_predictions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM tournament_config
      WHERE key = 'predictions_locked' AND value = 'true'
    )
  );

CREATE POLICY "Users can update own award predictions before lock" ON award_predictions
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM tournament_config
      WHERE key = 'predictions_locked' AND value = 'true'
    )
  );

-- ACTUAL AWARDS
CREATE POLICY "Actual awards viewable by authenticated" ON actual_awards
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can manage actual awards" ON actual_awards
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- SCORING RULES
CREATE POLICY "Scoring rules viewable by authenticated" ON scoring_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can manage scoring rules" ON scoring_rules
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- USER SCORES
CREATE POLICY "User scores viewable by authenticated" ON user_scores
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only system can manage user scores" ON user_scores
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- SCORE EVENTS
CREATE POLICY "Users can view own score events" ON score_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Only system can manage score events" ON score_events
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- CHAT MESSAGES
CREATE POLICY "Chat messages viewable by authenticated" ON chat_messages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can send chat messages if not banned" ON chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_chat_banned = true
    )
  );

CREATE POLICY "Admins can update chat messages" ON chat_messages
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- TOURNAMENT CONFIG
CREATE POLICY "Config viewable by authenticated" ON tournament_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can manage config" ON tournament_config
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE user_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
