INSERT INTO scoring_rules (category, rule_key, points, description)
VALUES
  ('qualification', 'qualify_finalist', 15, 'Equipo clasificado a la final'),
  ('knockout_exact', 'exact_sf', 7, 'Resultado exacto en semifinales con cruce acertado')
ON CONFLICT (rule_key) DO UPDATE SET
  category = EXCLUDED.category,
  points = EXCLUDED.points,
  description = EXCLUDED.description;

UPDATE scoring_rules
SET points = updated.points,
    description = updated.description,
    category = updated.category
FROM (
  VALUES
    ('group_stage', 'correct_sign', 1, 'Acertar signo 1X2 en fase de grupos'),
    ('group_stage', 'exact_score', 1, 'Resultado exacto en fase de grupos (+1 adicional)'),
    ('group_stage', 'group_pos_1st', 1, 'Acertar 1o de grupo'),
    ('group_stage', 'group_pos_2nd', 1, 'Acertar 2o de grupo'),
    ('group_stage', 'group_pos_3rd', 2, 'Acertar 3o de grupo'),
    ('group_stage', 'group_pos_4th', 2, 'Acertar 4o de grupo'),
    ('qualification', 'qualify_r32', 1, 'Equipo clasificado a dieciseisavos'),
    ('qualification', 'qualify_r16', 3, 'Equipo clasificado a octavos'),
    ('qualification', 'qualify_qf', 6, 'Equipo clasificado a cuartos'),
    ('qualification', 'qualify_sf', 10, 'Equipo clasificado a semifinales'),
    ('qualification', 'qualify_finalist', 15, 'Equipo clasificado a la final'),
    ('qualification', 'qualify_champion', 25, 'Acertar campeon'),
    ('qualification', 'qualify_third', 12, 'Acertar tercer puesto'),
    ('knockout_exact', 'exact_r32', 2, 'Resultado exacto en dieciseisavos con cruce acertado'),
    ('knockout_exact', 'exact_r16', 3, 'Resultado exacto en octavos con cruce acertado'),
    ('knockout_exact', 'exact_qf', 5, 'Resultado exacto en cuartos con cruce acertado'),
    ('knockout_exact', 'exact_sf', 7, 'Resultado exacto en semifinales con cruce acertado'),
    ('knockout_exact', 'exact_third', 8, 'Resultado exacto 3er puesto con cruce acertado'),
    ('knockout_exact', 'exact_final', 10, 'Resultado exacto en la final con cruce acertado'),
    ('awards', 'golden_boot', 10, 'Acertar Bota de Oro'),
    ('awards', 'golden_ball', 10, 'Acertar Balon de Oro'),
    ('awards', 'golden_glove', 10, 'Acertar Guante de Oro')
) AS updated(category, rule_key, points, description)
WHERE scoring_rules.rule_key = updated.rule_key;
