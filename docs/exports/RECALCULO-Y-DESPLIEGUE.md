# Despliegue y recálculo — desglose auditable + fix de scoring

Cambios incluidos:
- **Fix del bug de scoring** (paginación de las consultas grandes en `recalculateAllScores`).
- **Ranking** con total + desglose por tipo desplegable.
- **Perfil** con sección "Desglose de puntos" partido a partido.
- 3 migraciones SQL.

## Pasos (en orden)

1. **Desplegar el código** (push a la rama de producción / deploy en Vercel).
   - Las env vars `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` deben estar en Vercel (ya lo están; en local no, por eso el build local solo falla al prerenderizar `/login` y `/register`).

2. **Aplicar las migraciones** a la BD de producción (tu flujo habitual de Supabase, p. ej. `supabase db push`):
   - `028_open_score_events_read.sql` — abre la lectura del detalle de puntos a todos.
   - `029_user_score_breakdown_view.sql` — vista `user_score_breakdown` (alimenta el desglose).
   - `030_lock_predictions.sql` — pone `predictions_locked = true` (cierra edición y abre la lectura de predicciones de todos para la auditoría).

3. **Relanzar el recálculo** con el código ya desplegado:
   - Entra como admin → página de **Resultados** → botón de **recalcular puntos** (ejecuta `recalculateAllScores`, que ahora pagina y cuenta bien los clasificados).
   - Esto reescribe `score_events` y `user_scores`. La mayoría de usuarios subirá puntos de "clasificados".

## Verificación rápida tras el recálculo

- En la BD: `select tipo, sum(puntos) from user_score_breakdown group by tipo;` debe mostrar valores en `clasificados` para ~todos los usuarios con cuadro completo (antes, ~35 estaban a 0).
- En la web: el total de cada usuario en el ranking = suma de los 6 tipos del desplegable = suma de las secciones del perfil (todo deriva de `score_events`).

## Notas

- Antes de aplicar migraciones/recalcular, la web tolera la ausencia de la vista (muestra desglose a 0) sin romperse.
- El detalle de otros usuarios solo es visible tras la migración 030 (lock) + 028 (RLS de score_events).
- Explicación del bug para usuarios: ver apéndice en `docs/superpowers/specs/2026-06-30-desglose-ranking-perfil-auditable.md`.
