# Cuadro real, puntuación por enfrentamiento y visualización de cruces

Fecha: 2026-06-29
Estado: aprobado (diseño)

## Contexto y problema

El torneo entró en fase de cuadro (eliminatorias). Han aparecido cinco problemas
relacionados con cómo se introduce, puntúa y muestra el cuadro:

1. **No se puede meter resultados del cuadro desde admin.** Los partidos de
   eliminatorias (`matches` con `stage` distinto de `group`) tienen
   `home_team_id`/`away_team_id` en `null` (muestran "2A", "TBD"). Nadie rellena
   el cuadro real desde los resultados de grupos, y el guardado de resultados +
   el selector de ganador por penaltis dependen de que esos equipos existan. Por
   tanto el admin no puede registrar resultados de cruces.

2. **La visualización no muestra los cruces reales** ni la relación con los del
   usuario.

3. **Los puntos por resultado de cruce exigen coincidencia de slot.**
   `isKnockoutExactEligible` (`src/lib/scoring/knockout.ts`) compara
   `home_team_id`/`away_team_id` del slot real con los del slot predicho. Si el
   usuario puso, p. ej., Canadá–Sudáfrica en otro slot de la misma ronda (porque
   predijo otro orden de grupos), no recibe puntos aunque acierte el marcador.

4. **Verificar** que los puntos por "clasificado a ronda X" se dan aunque el
   equipo llegue por otra rama del cuadro.

5. **Verificar** la puntuación de fase de grupos, orden de grupos y clasificados
   a dieciseisavos, y que haya un sitio donde se muestre el ganador (1º de grupo
   / clasificados).

## Decisiones tomadas

- **Alcance de la puntuación por enfrentamiento (punto 3): misma ronda.** Se
  empareja la predicción del usuario con el partido real solo dentro de la misma
  ronda. No cruza rondas.
- **Cuadro real (punto 1): automático + editable.** El sistema calcula los
  clasificados reales y precarga el cuadro, pero el admin puede corregir
  cualquier equipo/slot a mano antes y después de meter resultados.
- **Tipo de acierto en knockout: marcador exacto.** Se mantiene el criterio
  actual (marcador exacto, con ganador por penaltis si hay empate). Lo único que
  cambia es que se empareja por equipos, no por slot.
- **Predicciones bloqueadas.** El torneo ya empezó; este trabajo es solo
  resultados + puntuación + visualización. No se toca la entrada de predicciones.

## Diseño

### A. Cuadro real en admin (punto 1)

**Cálculo — `computeActualBracket()` (nueva función en `src/lib/tournament/`).**
Reutiliza la lógica existente:

- `calculateGroupStandings` sobre los partidos de grupo **reales y terminados**
  para obtener 1º/2º de cada grupo.
- `getBestThirds` para los mejores terceros (desempate FIFA por defecto; sin
  override por usuario — el real usa el orden FIFA y, si hace falta, la
  corrección manual del admin).
- `populateKnockoutBracket` alimentado con los **resultados reales** en el lugar
  de las predicciones (mapa `match_number → { home_score, away_score,
  penalty_winner }` construido desde `matches`), de modo que:
  - Rellena los 16 partidos de dieciseisavos (slots `group_winner`,
    `group_runner_up`, `best_third`).
  - Hace **cascada hacia arriba**: el ganador de cada cruce terminado avanza al
    slot correspondiente de la ronda siguiente (`match_winner` / `match_loser`
    para el 3.er puesto).

El `penalty_winner` real se almacena como `penalty_winner_team_id`; se convierte
a `"home"`/`"away"` para alimentar la lógica de cascada existente.

**Persistencia.** El cuadro calculado se escribe en `matches`
(`home_team_id`, `away_team_id`). La regla de no pisado: la generación rellena
solo los slots **vacíos** (NULL); no sobrescribe equipos ya fijados a mano.

**Admin (`src/app/(admin)/admin/resultados/page.tsx`).**

- Botón **"Generar/actualizar cuadro real"** que ejecuta `computeActualBracket()`
  y persiste los equipos en los slots vacíos.
- En cada partido de cuadro con equipo "TBD", un **selector de equipo** para
  corregir/forzar el equipo de ese slot (auto + editable).
- Al **guardar un resultado** de un cruce, el ganador avanza automáticamente al
  slot de la siguiente ronda (recalcular cascada y persistir slots afectados que
  estén vacíos). Esto ya encaja con el flujo actual de `handleSaveResult` +
  `recalculateAllScores`.

> Nota: la puntuación `qualify_r32` ya está retrasada hasta que toda la ronda de
> dieciseisavos esté poblada (commit 645643e); generar el cuadro real completo es
> justo lo que activa esos puntos de forma consistente.

### B. Puntuación por enfrentamiento, misma ronda (punto 3)

**Helper compartido — `findUserPredictionForPairing(bracket, stage, teamA, teamB)`.**
Dado el cuadro ya resuelto del usuario (salida de `populateKnockoutBracket`, que
ya se construye por usuario en `buildPredictedKnockoutMatchesByUser`), busca el
partido **de la misma `stage`** en el que aparezcan **los dos** equipos del
cruce real (en cualquier orden y en cualquier slot). Devuelve ese partido
predicho (con su marcador y penaltis) o `null`. Como el cuadro es un árbol, cada
equipo aparece como máximo una vez por ronda, así que el emparejamiento es
inequívoco.

**Reescritura de `scoreKnockoutExact` (`src/lib/scoring/knockout.ts`).**
Para cada partido real terminado del cuadro y cada usuario:

1. Localizar la predicción del par con `findUserPredictionForPairing`. Si no
   existe → 0 puntos por resultado.
2. **Normalizar local/visitante por equipo**: comparar goles del equipo A reales
   contra los goles que el usuario asignó al equipo A (independientemente de si
   en su cuadro A era local o visitante), e igual para B.
3. Si el marcador coincide exactamente y, en caso de empate, el ganador por
   penaltis (por equipo) coincide → otorgar los puntos de esa ronda
   (`exact_r32`…`exact_final`, mismos valores actuales).

El `match_id`/`match_number` registrado en el `score_event` es el del partido
**real** (para que la notificación y el detalle apunten al partido correcto).

### C. Visualización de cruces (punto 2)

Usa el mismo `findUserPredictionForPairing` como fuente de verdad. Por cada
partido real del cuadro, en `/resultados` y como overlay en la vista "Cuadro" de
`/predicciones/eliminatorias`:

- **El cruce real** (equipos reales) y su resultado.
- **Si el usuario tiene ese cruce exacto** (mismo par, misma ronda): mostrar su
  marcador y el estado:
  - ✅ "Acertaste cruce y marcador" (marcador exacto) — con los puntos.
  - 🟡 "Tenías este cruce" (par correcto, marcador no).
- **Si el usuario NO tiene ese cruce**: **no** se muestra ningún marcador suyo.
  En su lugar, por cada uno de los dos equipos del partido real, indicar de
  forma visual:
  - si **lo lleva en esta ronda** (predijo que el equipo llega a esta ronda, por
    cualquier rama), y
  - si **lo lleva avanzando a la siguiente** (en su cuadro ese equipo gana este
    cruce / pasa de ronda).

  Esto explica visualmente por qué recibe o no los puntos de "clasificado a
  ronda X".

### D. Verificaciones (puntos 4 y 5)

- **Punto 4.** El código ya da los puntos por "clasificado a ronda X" por
  cualquier rama: `didPredictTeamInStage` (`src/lib/scoring/qualification.ts`)
  solo comprueba si el equipo aparece en **algún** partido de esa ronda en la
  predicción. Se añade un **test** que lo blinde (equipo que llega por una rama
  distinta a la predicha sigue puntuando).
- **Punto 5.**
  - Tests de fase de grupos (`correct_sign`, `exact_score`), orden de grupos
    (`group_pos_*`) y `qualify_r32`.
  - Asegurar que en `/resultados` hay un sitio que muestra el **ganador**: 1º de
    cada grupo (pestaña grupos) y los clasificados a dieciseisavos.

## Componentes y archivos afectados

| Área | Archivo | Cambio |
|------|---------|--------|
| Cálculo cuadro real | `src/lib/tournament/bracket.ts` (o nuevo `actual-bracket.ts`) | `computeActualBracket()` reutilizando `populateKnockoutBracket` con resultados reales |
| Helper de emparejado | `src/lib/scoring/knockout.ts` (o nuevo helper) | `findUserPredictionForPairing` |
| Puntuación knockout | `src/lib/scoring/knockout.ts` | Reescritura de matching por par + normalización local/visitante |
| Admin | `src/app/(admin)/admin/resultados/page.tsx` | Botón "Generar cuadro real", selector de equipo por slot, avance automático |
| Visualización | `src/app/(app)/resultados/page.tsx`, vista "Cuadro" de `src/app/(app)/predicciones/eliminatorias/page.tsx`, componentes de bracket | Chips de estado y badges por equipo |
| Display ganadores | `/resultados` (grupos / clasificados) | Mostrar 1º de grupo y clasificados a R32 |
| Tests | `src/lib/scoring/*.test.ts`, `src/lib/tournament/*.test.ts` | Cobertura puntos 3, 4, 5 y cuadro real |

## Fuera de alcance

- Cambiar la entrada de predicciones (bloqueadas).
- Añadir puntos por solo acertar el ganador del cruce (se mantiene marcador
  exacto).
- Emparejar enfrentamientos entre rondas distintas (solo misma ronda).
