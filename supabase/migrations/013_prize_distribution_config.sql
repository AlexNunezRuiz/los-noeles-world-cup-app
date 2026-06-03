INSERT INTO tournament_config (key, value)
VALUES (
  'prize_distribution',
  '[{"key":"first","label":"1o Clasificado","recipient":"ranking_1","type":"percentage","value":60,"active":true},{"key":"second","label":"2o Clasificado","recipient":"ranking_2","type":"percentage","value":25,"active":true},{"key":"third","label":"3o Clasificado","recipient":"ranking_3","type":"percentage","value":10,"active":true},{"key":"group_champion","label":"Campeon de grupos","recipient":"group_champion","type":"percentage","value":5,"active":true},{"key":"last_place","label":"Farolillo rojo","recipient":"last_place","type":"fixed","value":5,"active":true}]'
)
ON CONFLICT (key) DO NOTHING;
