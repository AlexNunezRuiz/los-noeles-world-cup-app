# Potencial y Estado de Porra

Fecha: 2026-06-03

## Objetivo

Dar visibilidad operativa sobre cada usuario sin revelar sus picks antes de tiempo.

La app debe permitir:

- Ver siempre qué usuarios registrados han rellenado su porra y en qué estado está cada fase.
- Bloquear la edición de predicciones al empezar el Mundial.
- Desbloquear la consulta de predicciones/resultados de otros usuarios cuando empiece el Mundial.
- Ver en la ficha de un usuario sus puntos actuales, máximo potencial compatible, eliminados clave, resultados pronosticados y cuadro final.

## Reglas de visibilidad

La pestaña de estado de porra es visible siempre para usuarios registrados. No muestra picks concretos, solo completitud por fase.

Las predicciones concretas de otros usuarios se desbloquean con el mismo criterio de cierre de porra: `lock_datetime` / inicio del Mundial. Antes de ese momento, cada usuario puede ver sus propios datos, pero no los resultados/picks de otros.

## Estado de porra por fases

En `Clasificación` se añadirá una pestaña separada llamada `Estado porra`.

Cada usuario registrado aparece con estado por fase:

- `Grupos`: número de partidos de grupo con ambos marcadores introducidos sobre 72.
- `Clasificados`: grupos con clasificación guardada sobre 12, y orden de mejores terceros si aplica.
- `Cuadro`: partidos de eliminatorias con ambos marcadores introducidos sobre 32, incluyendo ganador por penaltis cuando haya empate.
- `Premios`: premios individuales elegidos sobre 3.

Cada fase se representa como:

- `Sin empezar`: 0 completados.
- `Parcial`: más de 0 y menos del total esperado.
- `Completa`: total esperado completado.

La pantalla debe distinguir usuarios pagados y pendientes de pago sin ocultar el estado de completitud.

## Ficha de jugador

La ficha de jugador mostrará un resumen superior con:

- `Puntos`: total actual desde `user_scores`.
- `Máximos puntos potenciales`: máximo puntaje que el usuario puede alcanzar con un escenario real todavía compatible.
- `Semifinalistas eliminados`: cuántos equipos que el usuario tenía como semifinalistas ya no pueden llegar a semifinales.
- `Finalistas eliminados`: cuántos equipos que el usuario tenía como finalistas ya no pueden llegar a la final.

Después mostrará:

- `Resultados`: todos los resultados de su porra, centrados inicialmente en los últimos partidos jugados y los próximos por jugar. La vista debe permitir navegar hacia atrás y hacia delante.
- `Su cuadro final`: bracket predicho del usuario, con equipos vivos/eliminados y el estado de cada ronda.

## Cálculo de máximo potencial compatible

El máximo potencial no es una suma independiente de picks vivos. Debe respetar incompatibilidades del bracket.

Definición:

`Máximos puntos potenciales` es el mayor total que el usuario podría alcanzar en cualquier continuación del torneo que no contradiga los resultados reales ya jugados.

Ejemplo: si un finalista predicho y un semifinalista predicho se cruzan en octavos, no pueden sumar ambos caminos. El cálculo debe elegir la rama que dé más puntos al usuario. Si lo óptimo es que el finalista gane ese cruce y llegue a la final, el semifinalista no suma sus puntos de semifinal.

El cálculo debe:

- Partir de los puntos actuales ya conseguidos.
- Reconstruir el cuadro predicho del usuario a partir de `match_predictions`, `predicted_group_standings` y `predicted_best_third_order`.
- Respetar resultados reales ya jugados en `matches`.
- Simular continuaciones posibles del cuadro real todavía compatibles.
- Puntuar cada continuación con las reglas actuales de `scoring_rules`.
- Devolver el máximo total alcanzable.

No se deben usar valores hardcodeados de puntos. Todas las puntuaciones, incluidos premios, salen de `scoring_rules`, porque el admin puede editarlas.

## Premios en potencial

Los premios (`golden_boot`, `golden_ball`, `golden_glove`) se incluyen en el potencial.

Mientras no exista ganador oficial en `actual_awards` para un premio, ese premio sigue siendo potencialmente sumable por el usuario si tiene predicción para ese `award_type`.

Cuando exista ganador oficial:

- Si coincide con la predicción del usuario, esos puntos ya forman parte del total actual o se contabilizan como alcanzables.
- Si no coincide, esos puntos dejan de formar parte del máximo potencial.

Los puntos de premios se leen desde `scoring_rules` por `rule_key`, no desde constantes locales.

## Arquitectura propuesta

Crear un módulo de dominio para analítica de porras:

- `src/lib/predictions/completion.ts`: calcula estados por fase por usuario.
- `src/lib/scoring/potential.ts`: calcula máximo potencial compatible y eliminados clave.
- `src/lib/tournament/predicted-bracket.ts`: reconstruye el bracket predicho del usuario de forma reutilizable.

Las pantallas consumen estos helpers y no duplican lógica de negocio.

## Datos usados

Tablas principales:

- `profiles`: usuarios registrados, pago y nombre.
- `match_predictions`: resultados pronosticados por usuario.
- `predicted_group_standings`: clasificaciones de grupo pronosticadas.
- `predicted_best_third_order`: desempate/orden de mejores terceros.
- `award_predictions`: premios elegidos por usuario.
- `actual_awards`: premios oficiales definidos por admin.
- `matches`: resultados reales y estado `is_finished`.
- `scoring_rules`: puntos editables por admin.
- `user_scores`: puntos actuales agregados.

## UI propuesta

`/ranking`:

- Mantiene pestañas actuales de ranking.
- Añade pestaña `Estado porra`.
- Cada fila enlaza a `/jugador/[id]`.

`/jugador/[id]`:

- Cabecera de resumen con cuatro métricas.
- Bloque de resultados con navegación temporal.
- Bloque de cuadro final.
- Si la porra aún no está bloqueada y el perfil no es el usuario actual, se ocultan picks concretos y se muestra solo el estado de completitud.

## Testing

Se deben añadir pruebas unitarias para:

- Estados de completitud por fase.
- Potencial con finalista y semifinalista incompatibles por cruce directo.
- Potencial con equipo ya eliminado.
- Potencial de premios antes y después de `actual_awards`.
- Lectura de puntos desde `scoring_rules`.

También se debe verificar manualmente:

- `/ranking` muestra `Estado porra` antes del inicio del Mundial.
- `/jugador/[id]` no revela picks ajenos antes del bloqueo.
- `/jugador/[id]` revela detalle tras el bloqueo.
