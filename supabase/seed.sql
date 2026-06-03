-- ============================================================
-- SEED DATA - Mundial 2026
-- ============================================================

-- ============================================================
-- TOURNAMENT CONFIG
-- ============================================================
INSERT INTO tournament_config (key, value) VALUES
  ('predictions_locked', 'false'),
  ('lock_datetime', '2026-06-11T15:00:00Z'),
  ('bizum_phone', '+34627151087'),
  ('bizum_amount', '10'),
  ('tournament_name', 'Porra del Mundial 2026'),
  ('payment_amount', '5'),
  ('payment_method', 'transfer'),
  ('bank_account_holder', ''),
  ('bank_iban', ''),
  ('bank_concept_prefix', 'PORRA');

-- ============================================================
-- 48 TEAMS - Mundial 2026
-- ============================================================

-- Grupo A
INSERT INTO teams (name, code, flag_emoji, group_letter) VALUES
  ('México', 'MEX', '🇲🇽', 'A'),
  ('Sudáfrica', 'RSA', '🇿🇦', 'A'),
  ('Corea del Sur', 'KOR', '🇰🇷', 'A'),
  ('Chequia', 'CZE', '🇨🇿', 'A');

-- Grupo B
INSERT INTO teams (name, code, flag_emoji, group_letter) VALUES
  ('Canadá', 'CAN', '🇨🇦', 'B'),
  ('Bosnia y Herzegovina', 'BIH', '🇧🇦', 'B'),
  ('Catar', 'QAT', '🇶🇦', 'B'),
  ('Suiza', 'SUI', '🇨🇭', 'B');

-- Grupo C
INSERT INTO teams (name, code, flag_emoji, group_letter) VALUES
  ('Brasil', 'BRA', '🇧🇷', 'C'),
  ('Marruecos', 'MAR', '🇲🇦', 'C'),
  ('Haití', 'HAI', '🇭🇹', 'C'),
  ('Escocia', 'SCO', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'C');

-- Grupo D
INSERT INTO teams (name, code, flag_emoji, group_letter) VALUES
  ('Estados Unidos', 'USA', '🇺🇸', 'D'),
  ('Paraguay', 'PAR', '🇵🇾', 'D'),
  ('Australia', 'AUS', '🇦🇺', 'D'),
  ('Turquía', 'TUR', '🇹🇷', 'D');

-- Grupo E
INSERT INTO teams (name, code, flag_emoji, group_letter) VALUES
  ('Alemania', 'GER', '🇩🇪', 'E'),
  ('Curazao', 'CUW', '🇨🇼', 'E'),
  ('Costa de Marfil', 'CIV', '🇨🇮', 'E'),
  ('Ecuador', 'ECU', '🇪🇨', 'E');

-- Grupo F
INSERT INTO teams (name, code, flag_emoji, group_letter) VALUES
  ('Países Bajos', 'NED', '🇳🇱', 'F'),
  ('Japón', 'JPN', '🇯🇵', 'F'),
  ('Suecia', 'SWE', '🇸🇪', 'F'),
  ('Túnez', 'TUN', '🇹🇳', 'F');

-- Grupo G
INSERT INTO teams (name, code, flag_emoji, group_letter) VALUES
  ('Bélgica', 'BEL', '🇧🇪', 'G'),
  ('Egipto', 'EGY', '🇪🇬', 'G'),
  ('Irán', 'IRN', '🇮🇷', 'G'),
  ('Nueva Zelanda', 'NZL', '🇳🇿', 'G');

-- Grupo H
INSERT INTO teams (name, code, flag_emoji, group_letter) VALUES
  ('España', 'ESP', '🇪🇸', 'H'),
  ('Cabo Verde', 'CPV', '🇨🇻', 'H'),
  ('Arabia Saudita', 'KSA', '🇸🇦', 'H'),
  ('Uruguay', 'URU', '🇺🇾', 'H');

-- Grupo I
INSERT INTO teams (name, code, flag_emoji, group_letter) VALUES
  ('Francia', 'FRA', '🇫🇷', 'I'),
  ('Senegal', 'SEN', '🇸🇳', 'I'),
  ('Irak', 'IRQ', '🇮🇶', 'I'),
  ('Noruega', 'NOR', '🇳🇴', 'I');

-- Grupo J
INSERT INTO teams (name, code, flag_emoji, group_letter) VALUES
  ('Argentina', 'ARG', '🇦🇷', 'J'),
  ('Argelia', 'ALG', '🇩🇿', 'J'),
  ('Austria', 'AUT', '🇦🇹', 'J'),
  ('Jordania', 'JOR', '🇯🇴', 'J');

-- Grupo K
INSERT INTO teams (name, code, flag_emoji, group_letter) VALUES
  ('Portugal', 'POR', '🇵🇹', 'K'),
  ('R.D. del Congo', 'COD', '🇨🇩', 'K'),
  ('Uzbekistán', 'UZB', '🇺🇿', 'K'),
  ('Colombia', 'COL', '🇨🇴', 'K');

-- Grupo L
INSERT INTO teams (name, code, flag_emoji, group_letter) VALUES
  ('Inglaterra', 'ENG', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'L'),
  ('Croacia', 'CRO', '🇭🇷', 'L'),
  ('Ghana', 'GHA', '🇬🇭', 'L'),
  ('Panamá', 'PAN', '🇵🇦', 'L');

-- ============================================================
-- GROUP STAGE MATCHES (72 partidos: 12 grupos × 6 partidos)
-- ============================================================
-- For each group: M1: 1v2, M2: 3v4, M3: 1v3, M4: 2v4, M5: 1v4, M6: 2v3

-- Grupo A (teams 1-4, matches 1-6)
INSERT INTO matches (match_number, stage, group_letter, home_team_id, away_team_id, match_date) VALUES
  (1,  'group', 'A', 1, 2, '2026-06-11 16:00:00+00'),
  (2,  'group', 'A', 3, 4, '2026-06-11 19:00:00+00'),
  (3,  'group', 'A', 1, 3, '2026-06-15 16:00:00+00'),
  (4,  'group', 'A', 2, 4, '2026-06-15 19:00:00+00'),
  (5,  'group', 'A', 1, 4, '2026-06-19 19:00:00+00'),
  (6,  'group', 'A', 2, 3, '2026-06-19 19:00:00+00');

-- Grupo B (teams 5-8, matches 7-12)
INSERT INTO matches (match_number, stage, group_letter, home_team_id, away_team_id, match_date) VALUES
  (7,  'group', 'B', 5, 6, '2026-06-11 22:00:00+00'),
  (8,  'group', 'B', 7, 8, '2026-06-12 01:00:00+00'),
  (9,  'group', 'B', 5, 7, '2026-06-15 22:00:00+00'),
  (10, 'group', 'B', 6, 8, '2026-06-16 01:00:00+00'),
  (11, 'group', 'B', 5, 8, '2026-06-20 19:00:00+00'),
  (12, 'group', 'B', 6, 7, '2026-06-20 19:00:00+00');

-- Grupo C (teams 9-12, matches 13-18)
INSERT INTO matches (match_number, stage, group_letter, home_team_id, away_team_id, match_date) VALUES
  (13, 'group', 'C', 9, 10,  '2026-06-12 16:00:00+00'),
  (14, 'group', 'C', 11, 12, '2026-06-12 19:00:00+00'),
  (15, 'group', 'C', 9, 11,  '2026-06-16 16:00:00+00'),
  (16, 'group', 'C', 10, 12, '2026-06-16 19:00:00+00'),
  (17, 'group', 'C', 9, 12,  '2026-06-20 22:00:00+00'),
  (18, 'group', 'C', 10, 11, '2026-06-20 22:00:00+00');

-- Grupo D (teams 13-16, matches 19-24)
INSERT INTO matches (match_number, stage, group_letter, home_team_id, away_team_id, match_date) VALUES
  (19, 'group', 'D', 13, 14, '2026-06-12 22:00:00+00'),
  (20, 'group', 'D', 15, 16, '2026-06-13 01:00:00+00'),
  (21, 'group', 'D', 13, 15, '2026-06-16 22:00:00+00'),
  (22, 'group', 'D', 14, 16, '2026-06-17 01:00:00+00'),
  (23, 'group', 'D', 13, 16, '2026-06-21 19:00:00+00'),
  (24, 'group', 'D', 14, 15, '2026-06-21 19:00:00+00');

-- Grupo E (teams 17-20, matches 25-30)
INSERT INTO matches (match_number, stage, group_letter, home_team_id, away_team_id, match_date) VALUES
  (25, 'group', 'E', 17, 18, '2026-06-13 16:00:00+00'),
  (26, 'group', 'E', 19, 20, '2026-06-13 19:00:00+00'),
  (27, 'group', 'E', 17, 19, '2026-06-17 16:00:00+00'),
  (28, 'group', 'E', 18, 20, '2026-06-17 19:00:00+00'),
  (29, 'group', 'E', 17, 20, '2026-06-21 22:00:00+00'),
  (30, 'group', 'E', 18, 19, '2026-06-21 22:00:00+00');

-- Grupo F (teams 21-24, matches 31-36)
INSERT INTO matches (match_number, stage, group_letter, home_team_id, away_team_id, match_date) VALUES
  (31, 'group', 'F', 21, 22, '2026-06-13 22:00:00+00'),
  (32, 'group', 'F', 23, 24, '2026-06-14 01:00:00+00'),
  (33, 'group', 'F', 21, 23, '2026-06-17 22:00:00+00'),
  (34, 'group', 'F', 22, 24, '2026-06-18 01:00:00+00'),
  (35, 'group', 'F', 21, 24, '2026-06-22 19:00:00+00'),
  (36, 'group', 'F', 22, 23, '2026-06-22 19:00:00+00');

-- Grupo G (teams 25-28, matches 37-42)
INSERT INTO matches (match_number, stage, group_letter, home_team_id, away_team_id, match_date) VALUES
  (37, 'group', 'G', 25, 26, '2026-06-14 16:00:00+00'),
  (38, 'group', 'G', 27, 28, '2026-06-14 19:00:00+00'),
  (39, 'group', 'G', 25, 27, '2026-06-18 16:00:00+00'),
  (40, 'group', 'G', 26, 28, '2026-06-18 19:00:00+00'),
  (41, 'group', 'G', 25, 28, '2026-06-22 22:00:00+00'),
  (42, 'group', 'G', 26, 27, '2026-06-22 22:00:00+00');

-- Grupo H (teams 29-32, matches 43-48)
INSERT INTO matches (match_number, stage, group_letter, home_team_id, away_team_id, match_date) VALUES
  (43, 'group', 'H', 29, 30, '2026-06-14 22:00:00+00'),
  (44, 'group', 'H', 31, 32, '2026-06-15 01:00:00+00'),
  (45, 'group', 'H', 29, 31, '2026-06-18 22:00:00+00'),
  (46, 'group', 'H', 30, 32, '2026-06-19 01:00:00+00'),
  (47, 'group', 'H', 29, 32, '2026-06-23 19:00:00+00'),
  (48, 'group', 'H', 30, 31, '2026-06-23 19:00:00+00');

-- Grupo I (teams 33-36, matches 49-54)
INSERT INTO matches (match_number, stage, group_letter, home_team_id, away_team_id, match_date) VALUES
  (49, 'group', 'I', 33, 34, '2026-06-15 16:00:00+00'),
  (50, 'group', 'I', 35, 36, '2026-06-15 19:00:00+00'),
  (51, 'group', 'I', 33, 35, '2026-06-19 16:00:00+00'),
  (52, 'group', 'I', 34, 36, '2026-06-19 19:00:00+00'),
  (53, 'group', 'I', 33, 36, '2026-06-23 22:00:00+00'),
  (54, 'group', 'I', 34, 35, '2026-06-23 22:00:00+00');

-- Grupo J (teams 37-40, matches 55-60)
INSERT INTO matches (match_number, stage, group_letter, home_team_id, away_team_id, match_date) VALUES
  (55, 'group', 'J', 37, 38, '2026-06-16 16:00:00+00'),
  (56, 'group', 'J', 39, 40, '2026-06-16 19:00:00+00'),
  (57, 'group', 'J', 37, 39, '2026-06-20 16:00:00+00'),
  (58, 'group', 'J', 38, 40, '2026-06-20 19:00:00+00'),
  (59, 'group', 'J', 37, 40, '2026-06-24 19:00:00+00'),
  (60, 'group', 'J', 38, 39, '2026-06-24 19:00:00+00');

-- Grupo K (teams 41-44, matches 61-66)
INSERT INTO matches (match_number, stage, group_letter, home_team_id, away_team_id, match_date) VALUES
  (61, 'group', 'K', 41, 42, '2026-06-17 16:00:00+00'),
  (62, 'group', 'K', 43, 44, '2026-06-17 19:00:00+00'),
  (63, 'group', 'K', 41, 43, '2026-06-21 16:00:00+00'),
  (64, 'group', 'K', 42, 44, '2026-06-21 19:00:00+00'),
  (65, 'group', 'K', 41, 44, '2026-06-25 19:00:00+00'),
  (66, 'group', 'K', 42, 43, '2026-06-25 19:00:00+00');

-- Grupo L (teams 45-48, matches 67-72)
INSERT INTO matches (match_number, stage, group_letter, home_team_id, away_team_id, match_date) VALUES
  (67, 'group', 'L', 45, 46, '2026-06-18 16:00:00+00'),
  (68, 'group', 'L', 47, 48, '2026-06-18 19:00:00+00'),
  (69, 'group', 'L', 45, 47, '2026-06-22 16:00:00+00'),
  (70, 'group', 'L', 46, 48, '2026-06-22 19:00:00+00'),
  (71, 'group', 'L', 45, 48, '2026-06-26 19:00:00+00'),
  (72, 'group', 'L', 46, 47, '2026-06-26 19:00:00+00');

-- ============================================================
-- KNOCKOUT MATCHES (32 partidos)
-- Round of 32: matches 73-88 (16 matches)
-- Round of 16: matches 89-96 (8 matches)
-- Quarter-finals: matches 97-100 (4 matches)
-- Semi-finals: matches 101-102
-- Third place: match 103
-- Final: match 104
-- ============================================================

-- Round of 32 (official 2026 FIFA World Cup bracket)
INSERT INTO matches (match_number, stage, home_placeholder, away_placeholder, match_date) VALUES
  (73,  'round_of_32', '2A', '2B',            '2026-06-28 16:00:00+00'),
  (74,  'round_of_32', '1E', '3º A/B/C/D/F',  '2026-06-28 19:00:00+00'),
  (75,  'round_of_32', '1F', '2C',            '2026-06-28 22:00:00+00'),
  (76,  'round_of_32', '1C', '2F',            '2026-06-29 01:00:00+00'),
  (77,  'round_of_32', '1I', '3º C/D/F/G/H',  '2026-06-29 16:00:00+00'),
  (78,  'round_of_32', '2E', '2I',            '2026-06-29 19:00:00+00'),
  (79,  'round_of_32', '1A', '3º C/E/F/H/I',  '2026-06-29 22:00:00+00'),
  (80,  'round_of_32', '1L', '3º E/H/I/J/K',  '2026-06-30 01:00:00+00'),
  (81,  'round_of_32', '1D', '3º B/E/F/I/J',  '2026-06-30 16:00:00+00'),
  (82,  'round_of_32', '1G', '3º A/E/H/I/J',  '2026-06-30 19:00:00+00'),
  (83,  'round_of_32', '2K', '2L',            '2026-06-30 22:00:00+00'),
  (84,  'round_of_32', '1H', '2J',            '2026-07-01 01:00:00+00'),
  (85,  'round_of_32', '1B', '3º E/F/G/I/J',  '2026-07-01 16:00:00+00'),
  (86,  'round_of_32', '1J', '2H',            '2026-07-01 19:00:00+00'),
  (87,  'round_of_32', '1K', '3º D/E/I/J/L',  '2026-07-01 22:00:00+00'),
  (88,  'round_of_32', '2D', '2G',            '2026-07-02 01:00:00+00');

-- Round of 16 (official feeds)
INSERT INTO matches (match_number, stage, home_placeholder, away_placeholder, match_date) VALUES
  (89,  'round_of_16', 'W74', 'W77', '2026-07-04 16:00:00+00'),
  (90,  'round_of_16', 'W73', 'W75', '2026-07-04 19:00:00+00'),
  (91,  'round_of_16', 'W76', 'W78', '2026-07-04 22:00:00+00'),
  (92,  'round_of_16', 'W79', 'W80', '2026-07-05 01:00:00+00'),
  (93,  'round_of_16', 'W83', 'W84', '2026-07-05 16:00:00+00'),
  (94,  'round_of_16', 'W81', 'W82', '2026-07-05 19:00:00+00'),
  (95,  'round_of_16', 'W86', 'W88', '2026-07-05 22:00:00+00'),
  (96,  'round_of_16', 'W85', 'W87', '2026-07-06 01:00:00+00');

-- Quarter-finals (official feeds)
INSERT INTO matches (match_number, stage, home_placeholder, away_placeholder, match_date) VALUES
  (97,  'quarter_final', 'W89', 'W90', '2026-07-09 16:00:00+00'),
  (98,  'quarter_final', 'W93', 'W94', '2026-07-09 20:00:00+00'),
  (99,  'quarter_final', 'W91', 'W92', '2026-07-10 16:00:00+00'),
  (100, 'quarter_final', 'W95', 'W96', '2026-07-10 20:00:00+00');

-- Semi-finals
INSERT INTO matches (match_number, stage, home_placeholder, away_placeholder, match_date) VALUES
  (101, 'semi_final', 'W97', 'W98', '2026-07-13 20:00:00+00'),
  (102, 'semi_final', 'W99', 'W100', '2026-07-14 20:00:00+00');

-- Third place
INSERT INTO matches (match_number, stage, home_placeholder, away_placeholder, match_date) VALUES
  (103, 'third_place', 'L101', 'L102', '2026-07-18 19:00:00+00');

-- Final
INSERT INTO matches (match_number, stage, home_placeholder, away_placeholder, match_date) VALUES
  (104, 'final', 'W101', 'W102', '2026-07-19 20:00:00+00');

-- ============================================================
-- KNOCKOUT BRACKET POSITIONS
-- Defines how group results feed into knockout
-- ============================================================

-- Round of 32: per-match slot definitions (official 2026 FIFA World Cup bracket)
-- 73: R:A vs R:B
INSERT INTO knockout_bracket_positions (match_number, slot, source_type, source_group, description) VALUES
  (73, 'home', 'group_runner_up', 'A', '2ºA'),
  (73, 'away', 'group_runner_up', 'B', '2ºB');

-- 74: W:E vs T:A,B,C,D,F
INSERT INTO knockout_bracket_positions (match_number, slot, source_type, source_group, description) VALUES
  (74, 'home', 'group_winner', 'E', '1ºE');
INSERT INTO knockout_bracket_positions (match_number, slot, source_type, best_third_pool, description) VALUES
  (74, 'away', 'best_third', 'A,B,C,D,F', '3º mejor (A/B/C/D/F)');

-- 75: W:F vs R:C
INSERT INTO knockout_bracket_positions (match_number, slot, source_type, source_group, description) VALUES
  (75, 'home', 'group_winner', 'F', '1ºF'),
  (75, 'away', 'group_runner_up', 'C', '2ºC');

-- 76: W:C vs R:F
INSERT INTO knockout_bracket_positions (match_number, slot, source_type, source_group, description) VALUES
  (76, 'home', 'group_winner', 'C', '1ºC'),
  (76, 'away', 'group_runner_up', 'F', '2ºF');

-- 77: W:I vs T:C,D,F,G,H
INSERT INTO knockout_bracket_positions (match_number, slot, source_type, source_group, description) VALUES
  (77, 'home', 'group_winner', 'I', '1ºI');
INSERT INTO knockout_bracket_positions (match_number, slot, source_type, best_third_pool, description) VALUES
  (77, 'away', 'best_third', 'C,D,F,G,H', '3º mejor (C/D/F/G/H)');

-- 78: R:E vs R:I
INSERT INTO knockout_bracket_positions (match_number, slot, source_type, source_group, description) VALUES
  (78, 'home', 'group_runner_up', 'E', '2ºE'),
  (78, 'away', 'group_runner_up', 'I', '2ºI');

-- 79: W:A vs T:C,E,F,H,I
INSERT INTO knockout_bracket_positions (match_number, slot, source_type, source_group, description) VALUES
  (79, 'home', 'group_winner', 'A', '1ºA');
INSERT INTO knockout_bracket_positions (match_number, slot, source_type, best_third_pool, description) VALUES
  (79, 'away', 'best_third', 'C,E,F,H,I', '3º mejor (C/E/F/H/I)');

-- 80: W:L vs T:E,H,I,J,K
INSERT INTO knockout_bracket_positions (match_number, slot, source_type, source_group, description) VALUES
  (80, 'home', 'group_winner', 'L', '1ºL');
INSERT INTO knockout_bracket_positions (match_number, slot, source_type, best_third_pool, description) VALUES
  (80, 'away', 'best_third', 'E,H,I,J,K', '3º mejor (E/H/I/J/K)');

-- 81: W:D vs T:B,E,F,I,J
INSERT INTO knockout_bracket_positions (match_number, slot, source_type, source_group, description) VALUES
  (81, 'home', 'group_winner', 'D', '1ºD');
INSERT INTO knockout_bracket_positions (match_number, slot, source_type, best_third_pool, description) VALUES
  (81, 'away', 'best_third', 'B,E,F,I,J', '3º mejor (B/E/F/I/J)');

-- 82: W:G vs T:A,E,H,I,J
INSERT INTO knockout_bracket_positions (match_number, slot, source_type, source_group, description) VALUES
  (82, 'home', 'group_winner', 'G', '1ºG');
INSERT INTO knockout_bracket_positions (match_number, slot, source_type, best_third_pool, description) VALUES
  (82, 'away', 'best_third', 'A,E,H,I,J', '3º mejor (A/E/H/I/J)');

-- 83: R:K vs R:L
INSERT INTO knockout_bracket_positions (match_number, slot, source_type, source_group, description) VALUES
  (83, 'home', 'group_runner_up', 'K', '2ºK'),
  (83, 'away', 'group_runner_up', 'L', '2ºL');

-- 84: W:H vs R:J
INSERT INTO knockout_bracket_positions (match_number, slot, source_type, source_group, description) VALUES
  (84, 'home', 'group_winner', 'H', '1ºH'),
  (84, 'away', 'group_runner_up', 'J', '2ºJ');

-- 85: W:B vs T:E,F,G,I,J
INSERT INTO knockout_bracket_positions (match_number, slot, source_type, source_group, description) VALUES
  (85, 'home', 'group_winner', 'B', '1ºB');
INSERT INTO knockout_bracket_positions (match_number, slot, source_type, best_third_pool, description) VALUES
  (85, 'away', 'best_third', 'E,F,G,I,J', '3º mejor (E/F/G/I/J)');

-- 86: W:J vs R:H
INSERT INTO knockout_bracket_positions (match_number, slot, source_type, source_group, description) VALUES
  (86, 'home', 'group_winner', 'J', '1ºJ'),
  (86, 'away', 'group_runner_up', 'H', '2ºH');

-- 87: W:K vs T:D,E,I,J,L
INSERT INTO knockout_bracket_positions (match_number, slot, source_type, source_group, description) VALUES
  (87, 'home', 'group_winner', 'K', '1ºK');
INSERT INTO knockout_bracket_positions (match_number, slot, source_type, best_third_pool, description) VALUES
  (87, 'away', 'best_third', 'D,E,I,J,L', '3º mejor (D/E/I/J/L)');

-- 88: R:D vs R:G
INSERT INTO knockout_bracket_positions (match_number, slot, source_type, source_group, description) VALUES
  (88, 'home', 'group_runner_up', 'D', '2ºD'),
  (88, 'away', 'group_runner_up', 'G', '2ºG');

-- Round of 16: Winners of R32 (official feeds)
INSERT INTO knockout_bracket_positions (match_number, slot, source_type, source_match_number, description) VALUES
  (89, 'home', 'match_winner', 74, 'Ganador P74'),
  (89, 'away', 'match_winner', 77, 'Ganador P77'),
  (90, 'home', 'match_winner', 73, 'Ganador P73'),
  (90, 'away', 'match_winner', 75, 'Ganador P75'),
  (91, 'home', 'match_winner', 76, 'Ganador P76'),
  (91, 'away', 'match_winner', 78, 'Ganador P78'),
  (92, 'home', 'match_winner', 79, 'Ganador P79'),
  (92, 'away', 'match_winner', 80, 'Ganador P80'),
  (93, 'home', 'match_winner', 83, 'Ganador P83'),
  (93, 'away', 'match_winner', 84, 'Ganador P84'),
  (94, 'home', 'match_winner', 81, 'Ganador P81'),
  (94, 'away', 'match_winner', 82, 'Ganador P82'),
  (95, 'home', 'match_winner', 86, 'Ganador P86'),
  (95, 'away', 'match_winner', 88, 'Ganador P88'),
  (96, 'home', 'match_winner', 85, 'Ganador P85'),
  (96, 'away', 'match_winner', 87, 'Ganador P87');

-- Quarter-finals (official feeds)
INSERT INTO knockout_bracket_positions (match_number, slot, source_type, source_match_number, description) VALUES
  (97,  'home', 'match_winner', 89, 'Ganador P89'),
  (97,  'away', 'match_winner', 90, 'Ganador P90'),
  (98,  'home', 'match_winner', 93, 'Ganador P93'),
  (98,  'away', 'match_winner', 94, 'Ganador P94'),
  (99,  'home', 'match_winner', 91, 'Ganador P91'),
  (99,  'away', 'match_winner', 92, 'Ganador P92'),
  (100, 'home', 'match_winner', 95, 'Ganador P95'),
  (100, 'away', 'match_winner', 96, 'Ganador P96');

-- Semi-finals
INSERT INTO knockout_bracket_positions (match_number, slot, source_type, source_match_number, description) VALUES
  (101, 'home', 'match_winner', 97, 'Ganador P97'),
  (101, 'away', 'match_winner', 98, 'Ganador P98'),
  (102, 'home', 'match_winner', 99, 'Ganador P99'),
  (102, 'away', 'match_winner', 100, 'Ganador P100');

-- Third place and Final
INSERT INTO knockout_bracket_positions (match_number, slot, source_type, source_match_number, description) VALUES
  (103, 'home', 'match_loser', 101, 'Perdedor SF1'),
  (103, 'away', 'match_loser', 102, 'Perdedor SF2'),
  (104, 'home', 'match_winner', 101, 'Ganador SF1'),
  (104, 'away', 'match_winner', 102, 'Ganador SF2');

-- ============================================================
-- SCORING RULES
-- ============================================================
INSERT INTO scoring_rules (category, rule_key, points, description) VALUES
  -- Fase de Grupos
  ('group_stage', 'correct_sign', 1, 'Acertar signo 1X2 en fase de grupos'),
  ('group_stage', 'exact_score', 1, 'Resultado exacto en fase de grupos (+1 adicional)'),
  ('group_stage', 'group_pos_1st', 1, 'Acertar 1º de grupo'),
  ('group_stage', 'group_pos_2nd', 1, 'Acertar 2º de grupo'),
  ('group_stage', 'group_pos_3rd', 3, 'Acertar 3º de grupo'),
  ('group_stage', 'group_pos_4th', 3, 'Acertar 4º de grupo'),

  -- Clasificaciones (equipo pasa ronda)
  ('qualification', 'qualify_r32', 3, 'Equipo clasificado a octavos (R32)'),
  ('qualification', 'qualify_r16', 10, 'Equipo clasificado a cuartos'),
  ('qualification', 'qualify_qf', 15, 'Equipo clasificado a semifinal'),
  ('qualification', 'qualify_sf', 20, 'Equipo clasificado a final'),
  ('qualification', 'qualify_champion', 30, 'Acertar campeón'),
  ('qualification', 'qualify_third', 8, 'Acertar tercer puesto'),

  -- Eliminatorias exactas
  ('knockout_exact', 'exact_r32', 2, 'Resultado exacto en octavos (R32)'),
  ('knockout_exact', 'exact_r16', 4, 'Resultado exacto en cuartos (R16)'),
  ('knockout_exact', 'exact_qf', 6, 'Resultado exacto en semifinal'),
  ('knockout_exact', 'exact_third', 5, 'Resultado exacto 3º/4º puesto'),
  ('knockout_exact', 'exact_final', 10, 'Resultado exacto en la final'),

  -- Premios individuales
  ('awards', 'golden_boot', 10, 'Acertar Bota de Oro'),
  ('awards', 'golden_ball', 10, 'Acertar Balón de Oro'),
  ('awards', 'golden_glove', 10, 'Acertar Guante de Oro');

-- ============================================================
-- VENUES (16 sedes del Mundial 2026)
-- ============================================================
INSERT INTO venues (name, city, country) VALUES
  ('Mercedes-Benz Stadium', 'Atlanta', 'Estados Unidos'),
  ('Gillette Stadium', 'Foxborough', 'Estados Unidos'),
  ('AT&T Stadium', 'Arlington', 'Estados Unidos'),
  ('Estadio Akron', 'Zapopan', 'México'),
  ('NRG Stadium', 'Houston', 'Estados Unidos'),
  ('Arrowhead Stadium', 'Kansas City', 'Estados Unidos'),
  ('SoFi Stadium', 'Inglewood', 'Estados Unidos'),
  ('Estadio Azteca', 'Ciudad de México', 'México'),
  ('Hard Rock Stadium', 'Miami Gardens', 'Estados Unidos'),
  ('Estadio BBVA', 'Guadalupe', 'México'),
  ('MetLife Stadium', 'East Rutherford', 'Estados Unidos'),
  ('Lincoln Financial Field', 'Filadelfia', 'Estados Unidos'),
  ('Levi''s Stadium', 'Santa Clara', 'Estados Unidos'),
  ('Lumen Field', 'Seattle', 'Estados Unidos'),
  ('BMO Field', 'Toronto', 'Canadá'),
  ('BC Place', 'Vancouver', 'Canadá');

-- ============================================================
-- CALENDARIO OFICIAL: fecha (UTC) + sede de cada partido
-- Generado por scripts/build-schedule.mjs desde OpenFootball worldcup.json
-- ============================================================
UPDATE matches SET match_date='2026-06-11T19:00:00+00', venue_id=8 WHERE match_number=1;
UPDATE matches SET match_date='2026-06-12T02:00:00+00', venue_id=4 WHERE match_number=2;
UPDATE matches SET match_date='2026-06-19T01:00:00+00', venue_id=4 WHERE match_number=3;
UPDATE matches SET match_date='2026-06-18T16:00:00+00', venue_id=1 WHERE match_number=4;
UPDATE matches SET match_date='2026-06-25T01:00:00+00', venue_id=8 WHERE match_number=5;
UPDATE matches SET match_date='2026-06-25T01:00:00+00', venue_id=10 WHERE match_number=6;
UPDATE matches SET match_date='2026-06-12T19:00:00+00', venue_id=15 WHERE match_number=7;
UPDATE matches SET match_date='2026-06-13T19:00:00+00', venue_id=13 WHERE match_number=8;
UPDATE matches SET match_date='2026-06-18T22:00:00+00', venue_id=16 WHERE match_number=9;
UPDATE matches SET match_date='2026-06-18T19:00:00+00', venue_id=7 WHERE match_number=10;
UPDATE matches SET match_date='2026-06-24T19:00:00+00', venue_id=16 WHERE match_number=11;
UPDATE matches SET match_date='2026-06-24T19:00:00+00', venue_id=14 WHERE match_number=12;
UPDATE matches SET match_date='2026-06-13T22:00:00+00', venue_id=11 WHERE match_number=13;
UPDATE matches SET match_date='2026-06-14T01:00:00+00', venue_id=2 WHERE match_number=14;
UPDATE matches SET match_date='2026-06-20T00:30:00+00', venue_id=12 WHERE match_number=15;
UPDATE matches SET match_date='2026-06-19T22:00:00+00', venue_id=2 WHERE match_number=16;
UPDATE matches SET match_date='2026-06-24T22:00:00+00', venue_id=9 WHERE match_number=17;
UPDATE matches SET match_date='2026-06-24T22:00:00+00', venue_id=1 WHERE match_number=18;
UPDATE matches SET match_date='2026-06-13T01:00:00+00', venue_id=7 WHERE match_number=19;
UPDATE matches SET match_date='2026-06-14T04:00:00+00', venue_id=16 WHERE match_number=20;
UPDATE matches SET match_date='2026-06-19T19:00:00+00', venue_id=14 WHERE match_number=21;
UPDATE matches SET match_date='2026-06-20T03:00:00+00', venue_id=13 WHERE match_number=22;
UPDATE matches SET match_date='2026-06-26T02:00:00+00', venue_id=7 WHERE match_number=23;
UPDATE matches SET match_date='2026-06-26T02:00:00+00', venue_id=13 WHERE match_number=24;
UPDATE matches SET match_date='2026-06-14T17:00:00+00', venue_id=5 WHERE match_number=25;
UPDATE matches SET match_date='2026-06-14T23:00:00+00', venue_id=12 WHERE match_number=26;
UPDATE matches SET match_date='2026-06-20T20:00:00+00', venue_id=15 WHERE match_number=27;
UPDATE matches SET match_date='2026-06-21T00:00:00+00', venue_id=6 WHERE match_number=28;
UPDATE matches SET match_date='2026-06-25T20:00:00+00', venue_id=11 WHERE match_number=29;
UPDATE matches SET match_date='2026-06-25T20:00:00+00', venue_id=12 WHERE match_number=30;
UPDATE matches SET match_date='2026-06-14T20:00:00+00', venue_id=3 WHERE match_number=31;
UPDATE matches SET match_date='2026-06-15T02:00:00+00', venue_id=10 WHERE match_number=32;
UPDATE matches SET match_date='2026-06-20T17:00:00+00', venue_id=5 WHERE match_number=33;
UPDATE matches SET match_date='2026-06-21T04:00:00+00', venue_id=10 WHERE match_number=34;
UPDATE matches SET match_date='2026-06-25T23:00:00+00', venue_id=6 WHERE match_number=35;
UPDATE matches SET match_date='2026-06-25T23:00:00+00', venue_id=3 WHERE match_number=36;
UPDATE matches SET match_date='2026-06-15T19:00:00+00', venue_id=14 WHERE match_number=37;
UPDATE matches SET match_date='2026-06-16T01:00:00+00', venue_id=7 WHERE match_number=38;
UPDATE matches SET match_date='2026-06-21T19:00:00+00', venue_id=7 WHERE match_number=39;
UPDATE matches SET match_date='2026-06-22T01:00:00+00', venue_id=16 WHERE match_number=40;
UPDATE matches SET match_date='2026-06-27T03:00:00+00', venue_id=16 WHERE match_number=41;
UPDATE matches SET match_date='2026-06-27T03:00:00+00', venue_id=14 WHERE match_number=42;
UPDATE matches SET match_date='2026-06-15T16:00:00+00', venue_id=1 WHERE match_number=43;
UPDATE matches SET match_date='2026-06-15T22:00:00+00', venue_id=9 WHERE match_number=44;
UPDATE matches SET match_date='2026-06-21T16:00:00+00', venue_id=1 WHERE match_number=45;
UPDATE matches SET match_date='2026-06-21T22:00:00+00', venue_id=9 WHERE match_number=46;
UPDATE matches SET match_date='2026-06-27T00:00:00+00', venue_id=4 WHERE match_number=47;
UPDATE matches SET match_date='2026-06-27T00:00:00+00', venue_id=5 WHERE match_number=48;
UPDATE matches SET match_date='2026-06-16T19:00:00+00', venue_id=11 WHERE match_number=49;
UPDATE matches SET match_date='2026-06-16T22:00:00+00', venue_id=2 WHERE match_number=50;
UPDATE matches SET match_date='2026-06-22T21:00:00+00', venue_id=12 WHERE match_number=51;
UPDATE matches SET match_date='2026-06-23T00:00:00+00', venue_id=11 WHERE match_number=52;
UPDATE matches SET match_date='2026-06-26T19:00:00+00', venue_id=2 WHERE match_number=53;
UPDATE matches SET match_date='2026-06-26T19:00:00+00', venue_id=15 WHERE match_number=54;
UPDATE matches SET match_date='2026-06-17T01:00:00+00', venue_id=6 WHERE match_number=55;
UPDATE matches SET match_date='2026-06-17T04:00:00+00', venue_id=13 WHERE match_number=56;
UPDATE matches SET match_date='2026-06-22T17:00:00+00', venue_id=3 WHERE match_number=57;
UPDATE matches SET match_date='2026-06-23T03:00:00+00', venue_id=13 WHERE match_number=58;
UPDATE matches SET match_date='2026-06-28T02:00:00+00', venue_id=3 WHERE match_number=59;
UPDATE matches SET match_date='2026-06-28T02:00:00+00', venue_id=6 WHERE match_number=60;
UPDATE matches SET match_date='2026-06-17T17:00:00+00', venue_id=5 WHERE match_number=61;
UPDATE matches SET match_date='2026-06-18T02:00:00+00', venue_id=8 WHERE match_number=62;
UPDATE matches SET match_date='2026-06-23T17:00:00+00', venue_id=5 WHERE match_number=63;
UPDATE matches SET match_date='2026-06-24T02:00:00+00', venue_id=4 WHERE match_number=64;
UPDATE matches SET match_date='2026-06-27T23:30:00+00', venue_id=9 WHERE match_number=65;
UPDATE matches SET match_date='2026-06-27T23:30:00+00', venue_id=1 WHERE match_number=66;
UPDATE matches SET match_date='2026-06-17T20:00:00+00', venue_id=3 WHERE match_number=67;
UPDATE matches SET match_date='2026-06-17T23:00:00+00', venue_id=15 WHERE match_number=68;
UPDATE matches SET match_date='2026-06-23T20:00:00+00', venue_id=2 WHERE match_number=69;
UPDATE matches SET match_date='2026-06-23T23:00:00+00', venue_id=15 WHERE match_number=70;
UPDATE matches SET match_date='2026-06-27T21:00:00+00', venue_id=11 WHERE match_number=71;
UPDATE matches SET match_date='2026-06-27T21:00:00+00', venue_id=12 WHERE match_number=72;
UPDATE matches SET match_date='2026-06-28T19:00:00+00', venue_id=7 WHERE match_number=73;
UPDATE matches SET match_date='2026-06-29T20:30:00+00', venue_id=2 WHERE match_number=74;
UPDATE matches SET match_date='2026-06-30T01:00:00+00', venue_id=10 WHERE match_number=75;
UPDATE matches SET match_date='2026-06-29T17:00:00+00', venue_id=5 WHERE match_number=76;
UPDATE matches SET match_date='2026-06-30T21:00:00+00', venue_id=11 WHERE match_number=77;
UPDATE matches SET match_date='2026-06-30T17:00:00+00', venue_id=3 WHERE match_number=78;
UPDATE matches SET match_date='2026-07-01T01:00:00+00', venue_id=8 WHERE match_number=79;
UPDATE matches SET match_date='2026-07-01T16:00:00+00', venue_id=1 WHERE match_number=80;
UPDATE matches SET match_date='2026-07-02T00:00:00+00', venue_id=13 WHERE match_number=81;
UPDATE matches SET match_date='2026-07-01T20:00:00+00', venue_id=14 WHERE match_number=82;
UPDATE matches SET match_date='2026-07-02T23:00:00+00', venue_id=15 WHERE match_number=83;
UPDATE matches SET match_date='2026-07-02T19:00:00+00', venue_id=7 WHERE match_number=84;
UPDATE matches SET match_date='2026-07-03T03:00:00+00', venue_id=16 WHERE match_number=85;
UPDATE matches SET match_date='2026-07-03T22:00:00+00', venue_id=9 WHERE match_number=86;
UPDATE matches SET match_date='2026-07-04T01:30:00+00', venue_id=6 WHERE match_number=87;
UPDATE matches SET match_date='2026-07-03T18:00:00+00', venue_id=3 WHERE match_number=88;
UPDATE matches SET match_date='2026-07-04T21:00:00+00', venue_id=12 WHERE match_number=89;
UPDATE matches SET match_date='2026-07-04T17:00:00+00', venue_id=5 WHERE match_number=90;
UPDATE matches SET match_date='2026-07-05T20:00:00+00', venue_id=11 WHERE match_number=91;
UPDATE matches SET match_date='2026-07-06T00:00:00+00', venue_id=8 WHERE match_number=92;
UPDATE matches SET match_date='2026-07-06T19:00:00+00', venue_id=3 WHERE match_number=93;
UPDATE matches SET match_date='2026-07-07T00:00:00+00', venue_id=14 WHERE match_number=94;
UPDATE matches SET match_date='2026-07-07T16:00:00+00', venue_id=1 WHERE match_number=95;
UPDATE matches SET match_date='2026-07-07T20:00:00+00', venue_id=16 WHERE match_number=96;
UPDATE matches SET match_date='2026-07-09T20:00:00+00', venue_id=2 WHERE match_number=97;
UPDATE matches SET match_date='2026-07-10T19:00:00+00', venue_id=7 WHERE match_number=98;
UPDATE matches SET match_date='2026-07-11T21:00:00+00', venue_id=9 WHERE match_number=99;
UPDATE matches SET match_date='2026-07-12T01:00:00+00', venue_id=6 WHERE match_number=100;
UPDATE matches SET match_date='2026-07-14T19:00:00+00', venue_id=3 WHERE match_number=101;
UPDATE matches SET match_date='2026-07-15T19:00:00+00', venue_id=1 WHERE match_number=102;
UPDATE matches SET match_date='2026-07-18T21:00:00+00', venue_id=9 WHERE match_number=103;
UPDATE matches SET match_date='2026-07-19T19:00:00+00', venue_id=11 WHERE match_number=104;
