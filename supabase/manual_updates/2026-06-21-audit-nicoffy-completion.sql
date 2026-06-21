-- Audit Nicoffy's porra completion without changing data.
-- Run this in the Supabase SQL editor.

WITH target_profile AS (
  SELECT id, username, display_name, email
  FROM public.profiles
  WHERE lower(coalesce(username, '')) = 'nicoffy'
     OR lower(coalesce(display_name, '')) = 'nicoffy'
     OR lower(coalesce(email, '')) LIKE 'nicoffy@%'
  ORDER BY created_at DESC
  LIMIT 1
),
group_counts AS (
  SELECT
    tp.id AS user_id,
    COUNT(*) FILTER (WHERE m.stage = 'group')::INTEGER AS group_prediction_count,
    COUNT(*) FILTER (WHERE m.stage <> 'group')::INTEGER AS knockout_prediction_count,
    COUNT(*) FILTER (
      WHERE m.stage <> 'group'
        AND (
          mp.home_score <> mp.away_score
          OR mp.penalty_winner IN ('home', 'away')
        )
    )::INTEGER AS complete_knockout_prediction_count,
    COUNT(*) FILTER (
      WHERE m.stage <> 'group'
        AND mp.home_score = mp.away_score
        AND mp.penalty_winner IS NULL
    )::INTEGER AS tied_knockout_without_winner_count,
    MAX(GREATEST(mp.created_at, mp.updated_at)) AS match_predictions_updated_at
  FROM target_profile tp
  LEFT JOIN public.match_predictions mp ON mp.user_id = tp.id
  LEFT JOIN public.matches m ON m.id = mp.match_id
  GROUP BY tp.id
),
standing_counts AS (
  SELECT
    tp.id AS user_id,
    COUNT(pgs.id)::INTEGER AS group_standing_rows,
    COUNT(DISTINCT pgs.group_letter)::INTEGER AS group_standing_groups,
    MAX(GREATEST(pgs.created_at, pgs.updated_at)) AS group_standings_updated_at
  FROM target_profile tp
  LEFT JOIN public.predicted_group_standings pgs ON pgs.user_id = tp.id
  GROUP BY tp.id
),
best_third_counts AS (
  SELECT
    tp.id AS user_id,
    COUNT(pbto.team_id)::INTEGER AS best_third_order_rows,
    MAX(GREATEST(pbto.created_at, pbto.updated_at)) AS best_third_order_updated_at
  FROM target_profile tp
  LEFT JOIN public.predicted_best_third_order pbto ON pbto.user_id = tp.id
  GROUP BY tp.id
),
award_counts AS (
  SELECT
    tp.id AS user_id,
    COUNT(ap.id)::INTEGER AS award_prediction_count,
    MAX(GREATEST(ap.created_at, ap.updated_at)) AS award_predictions_updated_at
  FROM target_profile tp
  LEFT JOIN public.award_predictions ap ON ap.user_id = tp.id
  GROUP BY tp.id
)
SELECT
  tp.id AS user_id,
  tp.username,
  tp.display_name,
  tp.email,
  COALESCE(gc.group_prediction_count, 0) AS group_prediction_count,
  COALESCE(sc.group_standing_rows, 0) AS group_standing_rows,
  COALESCE(sc.group_standing_groups, 0) AS group_standing_groups,
  COALESCE(gc.knockout_prediction_count, 0) AS knockout_prediction_count,
  COALESCE(gc.complete_knockout_prediction_count, 0) AS complete_knockout_prediction_count,
  COALESCE(gc.tied_knockout_without_winner_count, 0) AS tied_knockout_without_winner_count,
  COALESCE(btc.best_third_order_rows, 0) AS best_third_order_rows,
  COALESCE(ac.award_prediction_count, 0) AS award_prediction_count,
  GREATEST(
    gc.match_predictions_updated_at,
    sc.group_standings_updated_at,
    btc.best_third_order_updated_at,
    ac.award_predictions_updated_at
  ) AS last_prediction_updated_at
FROM target_profile tp
LEFT JOIN group_counts gc ON gc.user_id = tp.id
LEFT JOIN standing_counts sc ON sc.user_id = tp.id
LEFT JOIN best_third_counts btc ON btc.user_id = tp.id
LEFT JOIN award_counts ac ON ac.user_id = tp.id;

-- Group-by-group detail: confirms whether the 72 group scores exist and which
-- group classifications are missing from predicted_group_standings.
WITH target_profile AS (
  SELECT id
  FROM public.profiles
  WHERE lower(coalesce(username, '')) = 'nicoffy'
     OR lower(coalesce(display_name, '')) = 'nicoffy'
     OR lower(coalesce(email, '')) LIKE 'nicoffy@%'
  ORDER BY created_at DESC
  LIMIT 1
),
groups AS (
  SELECT unnest(ARRAY['A','B','C','D','E','F','G','H','I','J','K','L']) AS group_letter
),
group_match_counts AS (
  SELECT
    m.group_letter,
    COUNT(mp.id)::INTEGER AS group_match_predictions
  FROM target_profile tp
  JOIN public.matches m ON m.stage = 'group'
  LEFT JOIN public.match_predictions mp
    ON mp.match_id = m.id
   AND mp.user_id = tp.id
  GROUP BY m.group_letter
),
standing_counts AS (
  SELECT
    pgs.group_letter,
    COUNT(pgs.id)::INTEGER AS standing_rows
  FROM target_profile tp
  JOIN public.predicted_group_standings pgs ON pgs.user_id = tp.id
  GROUP BY pgs.group_letter
)
SELECT
  g.group_letter,
  COALESCE(gmc.group_match_predictions, 0) AS group_match_predictions,
  COALESCE(sc.standing_rows, 0) AS standing_rows
FROM groups g
LEFT JOIN group_match_counts gmc ON gmc.group_letter = g.group_letter
LEFT JOIN standing_counts sc ON sc.group_letter = g.group_letter
ORDER BY g.group_letter;

-- Knockout ties that need Nicoffy to confirm who passes.
WITH target_profile AS (
  SELECT id
  FROM public.profiles
  WHERE lower(coalesce(username, '')) = 'nicoffy'
     OR lower(coalesce(display_name, '')) = 'nicoffy'
     OR lower(coalesce(email, '')) LIKE 'nicoffy@%'
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT
  m.match_number,
  m.stage,
  m.home_placeholder,
  m.away_placeholder,
  mp.home_score,
  mp.away_score,
  mp.penalty_winner,
  mp.updated_at
FROM target_profile tp
JOIN public.match_predictions mp ON mp.user_id = tp.id
JOIN public.matches m ON m.id = mp.match_id
WHERE m.stage <> 'group'
  AND mp.home_score = mp.away_score
  AND mp.penalty_winner IS NULL
ORDER BY m.match_number;
