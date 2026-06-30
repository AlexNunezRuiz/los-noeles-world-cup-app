# Desglose auditable de puntuaciones (ranking + perfil) y arreglo del scoring

Fecha: 2026-06-30

## Objetivo

Que cualquier participante pueda entender y verificar de dónde sale cada punto —el suyo y el de los demás— sin dudas. Para ello:

1. Arreglar el bug que hace que `recalculateAllScores` cuente mal los puntos de clasificación de eliminatorias (lee las tablas grandes truncadas a ~2.000 filas) y relanzar el recálculo.
2. Mostrar en el **ranking** el total + desglose por tipo de cada usuario.
3. Mostrar en cada **perfil** de dónde vienen los puntos, partido a partido y por tipo, de forma sencilla y visual.
4. Hacer que el resumen y el detalle sean coherentes por construcción, para dar confianza.

## Principio de diseño (clave de la auditabilidad)

`score_events` es la **única fuente de la verdad**. Todo deriva de ahí: el total del ranking, el desglose por tipo y el detalle del perfil. Así el total de cada usuario = suma de sus tipos = suma de sus eventos, sin posibilidad de descuadre. Se evita cualquier caché paralela que pueda desincronizarse.

## Alcance

Genérico para todo el torneo: grupos, eliminatorias exactas, clasificados por ronda y premios. Las secciones se rellenan solas según avanza el Mundial. (Hoy solo hay datos de fase de grupos y de los primeros dieciseisavos.)

---

## 1. Arreglo del bug de scoring

### Causa raíz (verificada)
En `src/lib/scoring/calculator.ts`, `buildPredictedKnockoutMatchesByUser` hace `select("*")` sin paginar sobre tablas grandes:
- `predicted_group_standings` (3.864 filas)
- `match_predictions` (8.181 filas)
- `predicted_best_third_order`
- `knockout_bracket_positions`

PostgREST limita la respuesta a ~2.000 filas. Los usuarios cuyas filas caen más allá del corte quedan con cuadro vacío/parcial → `qualify_r32` (y rondas posteriores y exactos de eliminatorias) mal contados, normalmente 0.

**Evidencia:** el conjunto de usuarios correctamente puntuados en `score_events` coincide exactamente con los que completan sus 12 grupos dentro de las primeras ~2.000 filas (corte empírico K=1973 → 39 usuarios). `group_pos` (consultado grupo a grupo con `.eq`) y signo/exacto (consultado por `match_id`) NO están afectados, lo que confirma que es un problema de las consultas grandes sin paginar.

### Solución
- Helper de paginación que recorre con `.range(from, to)` en bucle hasta agotar las filas (tamaño de página p. ej. 1.000), devolviendo el array completo.
- Aplicarlo a todas las lecturas grandes sin filtro en `calculator.ts` (las 4 de arriba; revisar también cualquier otra del recálculo que pueda superar ~1.000 filas).
- Re-ejecutar `recalculateAllScores` tras desplegar.

### Test (TDD)
- Test unitario que reproduzca el fallo: dataset con >2.000 filas repartidas entre muchos usuarios y comprobar que el helper devuelve todas y que la puntuación de clasificados sale completa. Comando: `npx tsx --test <archivo>`.

---

## 2. Visibilidad y cierre de predicciones

- `predictions_locked` está hoy en `false` (la edición sigue técnicamente abierta). Ponerlo a `true`: cierra la edición **y** abre la lectura de las predicciones de todos vía la RLS existente de `match_predictions` y `predicted_group_standings` (incluye pronósticos de partidos futuros, deseado).
- Migración SQL que abre el `SELECT` de `score_events` a todos los usuarios autenticados (hoy: solo los propios, `user_id = auth.uid()`). El `ALL` de admin se mantiene.
- Nota de seguridad: `score_events` solo contiene resultados ya resueltos; abrirlo no filtra nada sensible.

---

## 3. Fuente de datos del desglose

- Mapeo único `rule_key → tipo` en una util compartida (lib), con 6 tipos:
  - **Signo** ← `correct_sign`
  - **Exacto** ← `exact_score`
  - **Orden de grupos** ← `group_pos_1st|2nd|3rd|4th`
  - **Clasificados** ← `qualify_r32|r16|qf|sf|finalist|champion|runner_up|third|fourth`
  - **Eliminatorias (exactas)** ← `exact_r32|r16|qf|sf|third|final`
  - **Premios** ← `golden_boot|ball|glove`
- Vista SQL `user_score_breakdown` (`user_id`, `tipo`, `puntos`) que agrega `score_events` con ese mapeo. Lectura pública (acorde con la apertura de `score_events`). El ranking y los totales por tipo se leen de aquí.
- Test del mapeo: cada `rule_key` conocido cae en un tipo y ninguno queda sin clasificar.

---

## 4. Ranking (UI)

Archivo: `src/app/(app)/ranking/page.tsx` + `src/components/ranking/`.
- Se mantiene la `BreakdownBar` (se revisa para reflejar los 6 tipos / colores).
- Cada fila del ranking se vuelve **desplegable** (acordeón con primitivas Radix ya disponibles): al expandir muestra los 6 tipos con sus puntos, leídos de `user_score_breakdown`.
- Por defecto colapsado para no recargar; el orden sigue por total.

## 5. Perfil (UI) — partido a partido + por tipo

Archivo: `src/app/(app)/jugador/[id]/page.tsx` + componentes nuevos en `src/components/`.
- Cabecera: total + chips por tipo (de `user_score_breakdown`).
- Secciones colapsables por tipo:
  - **Partidos (signo/exacto):** por partido, pronóstico vs resultado real, ✓/✗ por signo y por exacto, y pts.
  - **Orden de grupos:** por grupo, posiciones acertadas (1º/2º/3º/4º) y pts.
  - **Clasificados:** equipos acertados/fallados (x/32) y pts; idem rondas siguientes según avance.
  - **Eliminatorias exactas / Premios:** aparecen cuando haya datos.
- Datos: `score_events` (pts por evento) + `match_predictions` / `predicted_group_standings` (reconstrucción pronóstico vs real) + `matches` / `teams`. Todas las lecturas que puedan superar ~1.000 filas, paginadas.
- Componentes reutilizables: `Card`, `Badge`, `Flag`, `GroupStandingsTable`, Tabs/Accordion de Radix.

## 6. Señales de confianza

- "Puntos recalculados: <fecha>" a partir de `user_scores.updated_at` (o `max(score_events.created_at)`).
- Coherencia garantizada: total del ranking = suma de tipos = suma de eventos del perfil (mismo origen).
- El botón admin de recalcular ya existe en la página de resultados.

---

## Componentes / unidades (límites claros)

- `lib`: helper de paginación (entrada: tabla/consulta + filtros; salida: todas las filas). Independiente y testeable.
- `lib`: mapeo `rule_key → tipo` (función pura, testeable).
- SQL: migración RLS de `score_events` + vista `user_score_breakdown`.
- SQL/config: `predictions_locked = true`.
- UI ranking: fila desplegable con desglose.
- UI perfil: secciones por tipo con reconstrucción partido a partido.

## Decisiones descartadas

- Cachear el desglose por tipo en columnas nuevas de `user_scores`: más rápido de leer pero puede desincronizarse del detalle; contradice el objetivo de confianza. La vista derivada de `score_events` no puede descuadrar.

## Riesgos / notas

- El recálculo borra y reinserta `score_events`; ejecutarlo cuando no haya ediciones en curso.
- Confirmar que la versión desplegada en producción incluye el arreglo antes de relanzar el recálculo (memoria: los deploys no actualizan la BD; el recálculo se dispara desde el admin desplegado).

---

## Apéndice: explicación del bug para los usuarios

> Hemos detectado y corregido un fallo técnico en el reparto de puntos de "equipos clasificados a dieciseisavos". El sistema, al recalcular, no leía las predicciones de todos los participantes a la vez, sino solo de una parte; a quienes quedaban fuera de ese grupo los veía "sin cuadro" y les daba 0 puntos de clasificados, aunque hubieran acertado.
>
> - No afectaba a signo, resultado exacto ni orden de los grupos: esos siempre se contaron bien.
> - Nadie tenía puntos de más ni hubo trampas; las predicciones de cada uno no han cambiado.
> - Tras el arreglo se recalcula con todas las predicciones, así que la mayoría subirá puntos. Ahora podéis ver el desglose de cada uno para comprobarlo.
>
> Causa técnica: al recalcular se pedían de golpe ~3.900 fichas de predicciones de grupos, pero la base de datos entrega como máximo ~2.000 por consulta; a partir de ahí el sistema no "veía" el cuadro de esas personas. La solución es pedir los datos por páginas hasta tenerlos todos.
