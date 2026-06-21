-- Find completed-looking knockout predictions where a tied match has no winner.
-- This is a read-only diagnostic query.

WITH completion AS (
  SELECT
    p.id AS user_id,
    COALESCE(gp.count, 0) AS group_prediction_count,
    COALESCE(gs.count, 0) AS group_standing_rows,
    COALESCE(kp.count, 0) AS knockout_prediction_count,
    COALESCE(ap.count, 0) AS award_prediction_count
  FROM public.profiles p
  LEFT JOIN (
    SELECT mp.user_id, COUNT(*)::INTEGER AS count
    FROM public.match_predictions mp
    JOIN public.matches m ON m.id = mp.match_id
    WHERE m.stage = 'group'
    GROUP BY mp.user_id
  ) gp ON gp.user_id = p.id
  LEFT JOIN (
    SELECT user_id, COUNT(*)::INTEGER AS count
    FROM public.predicted_group_standings
    GROUP BY user_id
  ) gs ON gs.user_id = p.id
  LEFT JOIN (
    SELECT mp.user_id, COUNT(*)::INTEGER AS count
    FROM public.match_predictions mp
    JOIN public.matches m ON m.id = mp.match_id
    WHERE m.stage <> 'group'
    GROUP BY mp.user_id
  ) kp ON kp.user_id = p.id
  LEFT JOIN (
    SELECT user_id, COUNT(*)::INTEGER AS count
    FROM public.award_predictions
    GROUP BY user_id
  ) ap ON ap.user_id = p.id
)
SELECT
  p.username,
  p.display_name,
  m.match_number,
  m.stage,
  mp.home_score,
  mp.away_score,
  mp.updated_at,
  c.group_prediction_count,
  c.group_standing_rows,
  c.knockout_prediction_count,
  c.award_prediction_count
FROM public.match_predictions mp
JOIN public.matches m ON m.id = mp.match_id
JOIN public.profiles p ON p.id = mp.user_id
JOIN completion c ON c.user_id = p.id
WHERE m.stage <> 'group'
  AND mp.home_score = mp.away_score
  AND mp.penalty_winner IS NULL
ORDER BY lower(COALESCE(p.username, p.display_name)), m.match_number;

-- Manual correction template after confirming who should pass:
--
-- UPDATE public.match_predictions mp
-- SET penalty_winner = 'home'
-- FROM public.profiles p, public.matches m
-- WHERE mp.user_id = p.id
--   AND mp.match_id = m.id
--   AND p.username = 'username_here'
--   AND m.match_number = 99;
