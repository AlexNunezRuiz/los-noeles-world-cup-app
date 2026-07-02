-- Evita duplicados en `score_events`.
--
-- Contexto: `recalculateAllScores` hace "borrar todos los eventos -> reinsertar",
-- pero se dispara desde el cliente (navegador del admin) y no es atómico. Si dos
-- pasadas se solapan, ambas borran y ambas insertan, acumulando filas idénticas.
-- Eso no afectaba a `user_scores` (se sobrescribe), pero inflaba el desglose de
-- puntos, que agrega `score_events` (se veían selecciones "repetidas").
--
-- Los eventos de clasificación (`qualify_*`) tienen `match_id` NULL, así que un
-- índice único normal NO los cazaría (NULL <> NULL). Se usa `NULLS NOT DISTINCT`
-- (PostgreSQL 15+) para tratar los NULL como iguales. La clave natural incluye
-- `description` porque el equipo/hito va embebido ahí (p. ej. "Equipo 10
-- clasificado a round_of_32"), no en columna propia.
--
-- El insert del recálculo pasa a `upsert ... on conflict do nothing`, de modo que
-- una pasada solapada ignora los eventos ya presentes en vez de duplicarlos.

create unique index if not exists score_events_dedup_uniq
  on public.score_events (user_id, rule_key, match_id, description)
  nulls not distinct;
