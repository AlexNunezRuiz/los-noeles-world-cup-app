# Diseño: Cruce del pronóstico + resumen de puntuaciones en eliminatorias

Fecha: 2026-07-01

## Contexto y problema

En la fase de eliminatorias, la app muestra el pronóstico del usuario como un
marcador suelto ("Tu 2-0") pegado al partido real. Esto es engañoso: en el
Calendario y en "Próximos partidos" el badge se lee de `match_predictions` **por
`match_id` (la casilla del cuadro)**, y esa casilla puede estar ahora ocupada por
selecciones distintas a las que el usuario colocó ahí. Resultado: aparece "Tu
2-0" junto a "México - Ecuador" cuando el 2-0 era para otro cruce.

El usuario quiere ver, para cada partido de eliminatoria:
1. El **cruce real que lleva** (las dos selecciones que él predijo en esa casilla),
   con banderas y su marcador.
2. Un **desplegable** que, para las dos selecciones que juegan el partido real,
   indique **en qué ronda las eliminó** en su cuadro (p.ej. "Inglaterra →
   Semifinales", "R.D. Congo → Dieciseisavos").
3. Estilo de marcador **tipo tablón deportivo** (`FlapTile`), como en grupos.
4. Acceso al **resumen de puntuaciones** desde su perfil y desde su porra, con
   desglose de **resultado exacto en eliminatoria** y de **clasificados por ronda**.

### Diagnóstico del "bug de puntos"

La puntuación de eliminatorias es **correcta**: `scoreKnockoutExact`
(`src/lib/scoring/knockout.ts`) empareja por IDs de selección vía
`findUserPredictionForPairing`, no por casilla. Si el usuario no llevaba ese cruce,
no se dan puntos. El defecto es puramente de **visualización** (el badge crudo por
`match_id`). El rediseño lo resuelve; se añade además un test de regresión que lo
confirma.

## Componentes

### 1. Helper `getUserEliminationRound` (nuevo)

`src/lib/results/elimination-round.ts`

```ts
type EliminationResult =
  | { kind: "eliminated"; stage: string }   // aparece y pierde en `stage`
  | { kind: "champion" }                      // gana la final en su cuadro
  | { kind: "not_qualified" };                // no aparece en ninguna ronda KO

function getUserEliminationRound(
  bracket: Map<number, PredictedKnockoutMatch>,
  stageByMatchNumber: Map<number, string>,
  teamId: number
): EliminationResult
```

Deriva del cuadro del usuario la ronda donde la selección cae. Reutiliza la
lógica de `didPredictTeamInStage` / `didPredictTeamWinStage` de `qualification.ts`
recorriendo las rondas de la más temprana a la más tardía: la eliminación es la
primera ronda donde la selección **aparece y no gana**. Si gana la final →
`champion`. Si no aparece en ninguna ronda → `not_qualified`.

### 2. Componente `PronosticoCruce` (nuevo, colapsable)

`src/components/results/pronostico-cruce.tsx`

Recibe: el partido real (stage + IDs de ambas selecciones reales), el cuadro del
usuario y un mapa de equipos.

- **Colapsado:** "Tu pronóstico" = el cruce que el usuario lleva en esa casilla
  (`bracket.get(match_number)`), con banderas + su marcador. Ej: 🏴 Inglaterra
  2–1 Francia 🇫🇷. Si no llevaba nada en esa casilla → "Sin predicción".
- **Desplegado:** repite el cruce con detalle y, para cada una de las **dos
  selecciones reales**, muestra `getUserEliminationRound` como etiqueta:
  "Inglaterra → Semifinales", "R.D. Congo → Dieciseisavos", "→ Campeón" o
  "No la clasificabas".
- Cerrado por defecto.

Para partidos de **grupos** no se usa este componente: se mantiene el badge
simple "Tu X–Y".

### 3. Datos (Calendario y Detalle)

Hoy el Calendario y el detalle solo cargan el marcador crudo por `match_id`.
Se añade construir el cuadro del usuario con `buildUserBracket`
(ya usado en Resultados) mediante un loader compartido
(`src/lib/results/load-user-bracket.ts`) que agrupa las consultas necesarias
(`predicted_group_standings`, `predicted_best_third_order`, `match_predictions`
por `match_number`, `knockout_bracket_positions`, partidos base). Calendario,
Resultados y Detalle lo reutilizan.

### 4. Resultados

- `KnockoutBracketResults` (`src/components/results/knockout-bracket-results.tsx`):
  usar `FlapTile` para el marcador (estilo tablón, como grupos) en vez de texto
  plano.
- Sustituir el chip "Local: en esta ronda" (`KnockoutComparisonChip`, rama
  "teams") por el nuevo `PronosticoCruce` con banderas + rondas de eliminación.
  Las ramas "exact"/"pairing" siguen resaltando el acierto, integradas en el
  encabezado del desplegable.
- "Próximos partidos" (`src/components/results/upcoming-strip.tsx`) usa el mismo
  componente en lugar del badge crudo, para partidos de eliminatoria.

### 5. Resumen de puntuaciones

- **Acceso:** enlace/botón prominente al desglose (`PointsAudit`, ya existente en
  `/jugador/[id]`) desde **Mi Porra** (`porra/page.tsx`) y **Mi Cuenta**
  (`mi-cuenta/page.tsx`), apuntando al perfil propio (`/jugador/{miId}`). Se
  enlaza, no se duplica el componente.
- **Clasificados por ronda:** hoy `auditQualified`
  (`src/lib/results/points-audit.ts`) solo evalúa clasificación a dieciseisavos
  con puntos planos, aunque `scoreQualification` premia r16/cuartos/semis/
  finalistas/campeón/subcampeón/3º/4º. Se reconstruye la sección "Clasificados"
  para desglosar **por ronda** con sus puntos, reflejando `scoreQualification`
  (mismos IDs de regla: `qualify_r32`, `qualify_r16`, `qualify_qf`, `qualify_sf`,
  `qualify_finalist`, `qualify_champion`, `qualify_runner_up`, `qualify_third`,
  `qualify_fourth`). La UI del `PointsAudit` agrupa la sección "clasificados" por
  ronda.
- **Resultado exacto en eliminatoria:** la sección "Eliminatorias (exacto)" ya
  existe en `PointsAudit`; se asegura que la página `/jugador/[id]` la rellene
  con los eventos `exact_*` y quede visible desde ambos accesos.

## Flujo de datos

Real match (stage, homeTeamId, awayTeamId) + user bracket → `PronosticoCruce`:
- cruce del usuario en la casilla → banderas + marcador propio
- por cada selección real → `getUserEliminationRound` → etiqueta de ronda

## Testing

- Test unitario de `getUserEliminationRound`: campeón, eliminado en cada ronda,
  no clasificado.
- Test de regresión de puntuación: un cuadro de usuario con cruce distinto al
  real **no** recibe puntos `exact_*` (confirma que el bug es de visualización,
  no de scoring). Ejecutar con `npx tsx --test <archivo>`.
- Test de `auditQualified` reconstruido: puntos por ronda coinciden con
  `scoreQualification` para un caso con equipos en varias rondas.

## Fuera de alcance (YAGNI)

- No se cambia el modelo de datos ni las reglas de puntuación.
- No se rediseña el cuadro editable de predicciones.
- No se toca la fase de grupos salvo lo estrictamente compartido.
