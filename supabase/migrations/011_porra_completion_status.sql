CREATE OR REPLACE FUNCTION public.get_porra_completion_status()
RETURNS TABLE (
  user_id UUID,
  group_prediction_count INTEGER,
  group_standing_rows INTEGER,
  knockout_prediction_count INTEGER,
  award_prediction_count INTEGER
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS user_id,
    COALESCE(group_predictions.count, 0)::INTEGER AS group_prediction_count,
    COALESCE(group_standings.count, 0)::INTEGER AS group_standing_rows,
    COALESCE(knockout_predictions.count, 0)::INTEGER AS knockout_prediction_count,
    COALESCE(award_predictions.count, 0)::INTEGER AS award_prediction_count
  FROM profiles p
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS count
    FROM match_predictions mp
    JOIN matches m ON m.id = mp.match_id
    WHERE mp.user_id = p.id AND m.stage = 'group'
  ) group_predictions ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS count
    FROM predicted_group_standings pgs
    WHERE pgs.user_id = p.id
  ) group_standings ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS count
    FROM match_predictions mp
    JOIN matches m ON m.id = mp.match_id
    WHERE mp.user_id = p.id AND m.stage <> 'group'
  ) knockout_predictions ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS count
    FROM award_predictions ap
    WHERE ap.user_id = p.id
  ) award_predictions ON true;
$$;

GRANT EXECUTE ON FUNCTION public.get_porra_completion_status() TO authenticated;
