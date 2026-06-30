-- 030 - Lock predictions.
--
-- The porra is closed: every prediction was made up front. Setting
-- predictions_locked = true (a) prevents any further edits and (b) opens reads
-- of everyone's match_predictions / predicted_group_standings to all
-- authenticated users via the existing RLS policies, enabling the
-- match-by-match audit on every profile.

INSERT INTO tournament_config (key, value)
VALUES ('predictions_locked', 'true')
ON CONFLICT (key) DO UPDATE SET value = 'true', updated_at = now();

NOTIFY pgrst, 'reload schema';
