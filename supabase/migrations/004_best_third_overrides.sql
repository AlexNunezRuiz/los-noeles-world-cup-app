-- ============================================================
-- BEST THIRD MANUAL ORDER
-- ============================================================
CREATE TABLE predicted_best_third_order (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES teams(id),
  rank INTEGER NOT NULL CHECK (rank BETWEEN 1 AND 12),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, team_id),
  UNIQUE(user_id, rank)
);

CREATE INDEX idx_predicted_best_third_order_user ON predicted_best_third_order(user_id);

ALTER TABLE predicted_best_third_order ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own best third order before lock" ON predicted_best_third_order
  FOR SELECT USING (
    auth.uid() = user_id AND
    NOT EXISTS (
      SELECT 1 FROM tournament_config
      WHERE key = 'predictions_locked' AND value = 'true'
    )
  );

CREATE POLICY "Users can insert own best third order before lock" ON predicted_best_third_order
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    NOT EXISTS (
      SELECT 1 FROM tournament_config
      WHERE key = 'predictions_locked' AND value = 'true'
    )
  );

CREATE POLICY "Users can update own best third order before lock" ON predicted_best_third_order
  FOR UPDATE USING (
    auth.uid() = user_id AND
    NOT EXISTS (
      SELECT 1 FROM tournament_config
      WHERE key = 'predictions_locked' AND value = 'true'
    )
  );

CREATE POLICY "Users can delete own best third order before lock" ON predicted_best_third_order
  FOR DELETE USING (
    auth.uid() = user_id AND
    NOT EXISTS (
      SELECT 1 FROM tournament_config
      WHERE key = 'predictions_locked' AND value = 'true'
    )
  );
