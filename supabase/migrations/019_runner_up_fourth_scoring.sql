INSERT INTO scoring_rules (category, rule_key, points, description)
VALUES
  ('qualification', 'qualify_runner_up', 18, 'Acertar subcampeon'),
  ('qualification', 'qualify_fourth', 10, 'Acertar cuarto clasificado')
ON CONFLICT (rule_key) DO UPDATE SET
  category = EXCLUDED.category,
  points = EXCLUDED.points,
  description = EXCLUDED.description;

UPDATE scoring_rules
SET description = updated.description
FROM (
  VALUES
    ('exact_r32', 'Resultado exacto en dieciseisavos con cruce exacto acertado'),
    ('exact_r16', 'Resultado exacto en octavos con cruce exacto acertado'),
    ('exact_qf', 'Resultado exacto en cuartos con cruce exacto acertado'),
    ('exact_sf', 'Resultado exacto en semifinales con cruce exacto acertado'),
    ('exact_third', 'Resultado exacto 3er puesto con cruce exacto acertado'),
    ('exact_final', 'Resultado exacto en la final con cruce exacto acertado')
) AS updated(rule_key, description)
WHERE scoring_rules.rule_key = updated.rule_key;
