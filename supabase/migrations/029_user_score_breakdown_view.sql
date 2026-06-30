-- 029 - Aggregated per-user, per-type points breakdown.
--
-- Single source of truth for the ranking/profile breakdown: it derives the six
-- types straight from score_events, so the summary can never drift from the
-- detail. The CASE here MIRRORS src/lib/scoring/breakdown.ts ruleKeyToBreakdownType.
-- Keep both in sync.
--
-- security_invoker = on so the view respects the querying user's RLS on
-- score_events (opened to all authenticated in migration 028).

CREATE OR REPLACE VIEW public.user_score_breakdown
WITH (security_invoker = on) AS
SELECT
  user_id,
  CASE
    WHEN rule_key = 'correct_sign' THEN 'signo'
    WHEN rule_key = 'exact_score' THEN 'exacto'
    WHEN rule_key LIKE 'group_pos_%' THEN 'orden'
    WHEN rule_key LIKE 'qualify_%' THEN 'clasificados'
    WHEN rule_key LIKE 'exact_%' THEN 'eliminatorias'
    WHEN rule_key IN ('golden_boot', 'golden_ball', 'golden_glove') THEN 'premios'
    ELSE 'otros'
  END AS tipo,
  SUM(points)::int AS puntos
FROM public.score_events
GROUP BY user_id, tipo;

GRANT SELECT ON public.user_score_breakdown TO authenticated;

NOTIFY pgrst, 'reload schema';
