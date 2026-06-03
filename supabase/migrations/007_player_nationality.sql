-- ============================================================
-- 007 - Player nationality for official squad lists
-- ============================================================

ALTER TABLE players ADD COLUMN IF NOT EXISTS nationality TEXT;

CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
