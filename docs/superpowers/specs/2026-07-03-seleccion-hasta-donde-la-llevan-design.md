# Selección: "Hasta dónde la llevan" — Diseño

Fecha: 2026-07-03

## Objetivo

En la página de una selección (`/equipos/[id]`), añadir una sección que muestre,
para cada participante, hasta qué ronda la lleva su pronóstico. Ejemplo: en
Portugal, Alex la elimina en semis, José la lleva campeona, etc.

## Decisiones de producto

- **Visibilidad:** la sección **solo se muestra tras el cierre** de predicciones
  (`isPredictionsLocked(config)`). Antes muestra un aviso "Disponible cuando se
  cierren las predicciones" para no revelar pronósticos ajenos.
- **Participantes:** solo perfiles con `has_paid = true`.
- **Orden:** por ranking del usuario (puntos actuales, `user_scores.total_points`
  desc). Desempate por `display_name`.

## Ubicación

Se añade a la página existente `/equipos/[id]`
(`src/app/(app)/equipos/[id]/page.tsx`), debajo de "Calendario y resultados" y
"Plantilla oficial". No se crea página nueva; los enlaces de Clasificados y del
Cuadro ya apuntan ahí.

## Arquitectura (reutiliza lo existente)

1. `loadAllUserBrackets(supabase, matches)` — YA EXISTE en
   `src/lib/results/load-all-user-brackets.ts`. Reconstruye el cuadro predicho de
   todos los usuarios, indexado por `user_id`. Ya pagina con `fetchAllRows`, así
   que evita el límite de ~1000 filas de PostgREST (bug conocido). Devuelve
   `Map<user_id, BuiltUserBracket>`, con `byMatchNumber` y `stageByMatchNumber`.

2. **Nueva función pura** `teamFurthestReach(bracket, teamId)` en
   `src/lib/results/team-progression.ts`. A partir de `byMatchNumber` y
   `stageByMatchNumber`, calcula el outcome tipado del equipo en ese cuadro.
   Con tests (`npx tsx --test src/lib/results/team-progression.test.ts`).

3. **Página**: si está bloqueado, carga en paralelo:
   - perfiles con `has_paid = true` (`id, display_name, username`),
   - `user_scores` (`user_id, total_points`) para ordenar,
   - `matches` (todas, para pasar a `loadAllUserBrackets`),
   - `loadAllUserBrackets(...)`.

   Luego, para cada usuario pagado calcula `teamFurthestReach(bracket, teamId)`,
   ordena por puntos desc y pinta la lista con pills de color según profundidad.

## Modelo de outcome

```ts
type Stage = "round_of_32" | "round_of_16" | "quarter_final" | "semi_final";

type TeamReach =
  | { kind: "champion" }             // gana la final
  | { kind: "runner_up" }            // pierde la final
  | { kind: "third" }                // gana el 3er puesto
  | { kind: "fourth" }               // pierde el 3er puesto
  | { kind: "semifinalist" }         // llega a semis; 3er puesto sin resultado
  | { kind: "eliminated"; stage: Stage } // pierde en R32/R16/QF
  | { kind: "reached"; stage: Stage }    // gana una ronda pero la siguiente sin resolver
  | { kind: "none" };                // no aparece en eliminatorias
```

### Algoritmo

Ranking de rondas: `round_of_32 (1) < round_of_16 (2) < quarter_final (3) <
semi_final (4) < {third_place, final} (5)`.

1. Reunir todos los partidos donde el equipo aparece (home o away) en el cuadro
   del usuario.
2. Si no aparece en ninguno → `none` (no la clasifica / fase de grupos).
3. Tomar el partido de ronda **más profunda** donde aparece. Determinar el
   ganador con `home_score`/`away_score` y `penalty_winner`.
   - `final` + gana → `champion`; `final` + pierde → `runner_up`.
   - `third_place` + gana → `third`; `third_place` + pierde → `fourth`;
     `third_place` sin resultado predicho → `semifinalist`.
   - `semi_final` + pierde → `semifinalist` (caso borde: el 3er puesto no se
     rellenó); `semi_final` + gana pero final sin resolver → `reached: semi_final`.
   - Otra ronda (`R32`/`R16`/`QF`) + pierde → `eliminated{stage}`.
   - Otra ronda + gana pero siguiente sin resolver → `reached{stage}`.
   - Aparece sin resultado predicho → `reached{stage}` de esa ronda.

Nota de estructura: los perdedores de semis caen al partido por el 3er puesto,
así que un semifinalista termina como 3º/4º si predijo ese partido, o
`semifinalist` si lo dejó en blanco.

## UI

- Título de sección: "Hasta dónde la llevan".
- Cada fila: `display_name` + pill con la etiqueta, coloreada por profundidad
  (campeón dorado, subcampeón/podio, ..., "No la clasifica" en gris).
- Etiquetas: 🏆 Campeón · Subcampeón · 3er puesto · 4º puesto · Semifinalista ·
  Cuartos · Octavos · Dieciseisavos · No la clasifica.
- (Opcional) resumen arriba: "N la ven campeona".
- Estilo coherente con las tarjetas existentes de la página (`rounded-xl border
  border-border bg-surface`, cabecera `bg-surface-sunken`, `font-marcador`).

## Fuera de alcance (YAGNI)

- No se toca el cálculo de puntuación ni el scoring.
- No se añaden filtros ni búsqueda de usuarios.
- No se muestran resultados concretos por partido, solo la ronda alcanzada.
