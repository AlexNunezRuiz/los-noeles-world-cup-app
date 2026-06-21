-- 027 - Count knockout predictions as complete only when tied matches have a winner.

CREATE OR REPLACE FUNCTION public.get_porra_completion_status()
RETURNS TABLE (
  user_id UUID,
  group_prediction_count INTEGER,
  group_standing_rows INTEGER,
  knockout_prediction_count INTEGER,
  award_prediction_count INTEGER,
  last_prediction_updated_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  WITH group_prediction_counts AS (
    SELECT mp.user_id, COUNT(*)::INTEGER AS count
    FROM match_predictions mp
    JOIN matches m ON m.id = mp.match_id
    WHERE m.stage = 'group'
    GROUP BY mp.user_id
  ),
  knockout_prediction_counts AS (
    SELECT mp.user_id, COUNT(*)::INTEGER AS count
    FROM match_predictions mp
    JOIN matches m ON m.id = mp.match_id
    WHERE m.stage <> 'group'
      AND (
        mp.home_score <> mp.away_score
        OR mp.penalty_winner IN ('home', 'away')
      )
    GROUP BY mp.user_id
  ),
  group_standing_counts AS (
    SELECT pgs.user_id, COUNT(*)::INTEGER AS count
    FROM predicted_group_standings pgs
    GROUP BY pgs.user_id
  ),
  award_prediction_counts AS (
    SELECT ap.user_id, COUNT(*)::INTEGER AS count
    FROM award_predictions ap
    GROUP BY ap.user_id
  ),
  prediction_updates AS (
    SELECT mp.user_id, MAX(GREATEST(mp.created_at, mp.updated_at)) AS updated_at
    FROM match_predictions mp
    GROUP BY mp.user_id
    UNION ALL
    SELECT pgs.user_id, MAX(GREATEST(pgs.created_at, pgs.updated_at)) AS updated_at
    FROM predicted_group_standings pgs
    GROUP BY pgs.user_id
    UNION ALL
    SELECT ap.user_id, MAX(GREATEST(ap.created_at, ap.updated_at)) AS updated_at
    FROM award_predictions ap
    GROUP BY ap.user_id
    UNION ALL
    SELECT pbto.user_id, MAX(GREATEST(pbto.created_at, pbto.updated_at)) AS updated_at
    FROM predicted_best_third_order pbto
    GROUP BY pbto.user_id
  ),
  last_prediction_update AS (
    SELECT pu.user_id, MAX(pu.updated_at) AS updated_at
    FROM prediction_updates pu
    GROUP BY pu.user_id
  )
  SELECT
    p.id AS user_id,
    COALESCE(gp.count, 0)::INTEGER AS group_prediction_count,
    COALESCE(gs.count, 0)::INTEGER AS group_standing_rows,
    COALESCE(kp.count, 0)::INTEGER AS knockout_prediction_count,
    COALESCE(ap.count, 0)::INTEGER AS award_prediction_count,
    lpu.updated_at AS last_prediction_updated_at
  FROM profiles p
  LEFT JOIN group_prediction_counts gp ON gp.user_id = p.id
  LEFT JOIN group_standing_counts gs ON gs.user_id = p.id
  LEFT JOIN knockout_prediction_counts kp ON kp.user_id = p.id
  LEFT JOIN award_prediction_counts ap ON ap.user_id = p.id
  LEFT JOIN last_prediction_update lpu ON lpu.user_id = p.id;
$$;

GRANT EXECUTE ON FUNCTION public.get_porra_completion_status() TO authenticated;

NOTIFY pgrst, 'reload schema';
