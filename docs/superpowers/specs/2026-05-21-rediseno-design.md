# Rediseño UX/UI — Porra del Mundial 2026

**Fecha:** 2026-05-21
**Estado:** Diseño aprobado · pendiente de plan de implementación

---

## 1. Resumen y objetivos

Rediseño integral de la PWA "Porra del Mundial 2026" (app privada de quiniela para
un grupo de amigos/familia, "los noeles"). No se toca el backend ni la lógica de
puntuación: es un rediseño **visual** y de **UX/arquitectura de información**.

Objetivos:

1. **Estética nivel agencia, con personalidad** — alejarse del look genérico "de IA".
2. **Rellenar la porra fácil**, especialmente en móvil (la acción se repite 104 veces).
3. **Seguir resultados y clasificación fácil** durante el torneo.
4. **Navegación sin fricción** entre las fases dependientes de la porra — es el punto
   que decide si la gente termina la porra o la abandona.

---

## 2. Sistema de diseño

### 2.1 Concepto

**"Estadio en directo"** con un **toque retro** (dosis media): energía de
retransmisión deportiva y de marcador mecánico, sobre un alma de programa de
partido impreso.

### 2.2 Paleta — "Crema & Tinta 26"

Tema **claro**. Lectura cálida del núcleo neutro oficial del Mundial 2026
(negro/blanco/oro), con los tres colores anfitriones como acentos funcionales.

| Token | Hex | Uso |
|---|---|---|
| Crema / Fondo | `#F0ECE1` | Lienzo de toda la app |
| Superficie | `#FFFFFF` | Tarjetas y paneles |
| Superficie hundida | `#F4F1E8` | Casillas vacías, filas alternas |
| Borde | `#E4DFD0` | Separación suave |
| Tinta | `#1A1A17` | Texto principal, fichas de marcador |
| Tinta apagada | `#7C766A` | Texto secundario |
| Tinta tenue | `#A39C8C` | Etiquetas, metadatos |
| **Rojo (Canadá) — Primario** | `#DD352B` | Botones, acción, "tú" |
| Rojo pulsado | `#C32E20` | Hover / activo |
| **Verde (México) — Acierto** | `#0E8A4A` | Resultado exacto, pago confirmado |
| **Azul (EE.UU.) — Info** | `#2C5BD6` | Jornadas, datos, enlaces |
| **Oro (Trofeo) — Podio** | `#C6932F` | 1º puesto, premios |
| Ámbar — Aviso | `#D98521` | Token funcional menor (pendiente/aviso) |

Cada color tiene un único trabajo. El rojo no se satura: manda solo en acción y
"tú". Integración con el Mundial **conceptual, no decorativa** — cada acento es un
país anfitrión.

### 2.3 Tipografía

- **Rajdhani** — marcador: títulos de pantalla, cifras, marcadores, posiciones.
  Voz de panel digital deportivo. Pesos 500/600/700.
- **Archivo** — texto: cuerpo, etiquetas, chat, descripciones. Pesos 400–900.
- Ambas vía `next/font/google`. Cifras siempre tabulares cuando aplique.

### 2.4 Lenguaje retro (dosis media)

- **Ficha de tablero abatible (split-flap)** — elemento estrella. Todas las cifras
  de marcador viven en fichas con costura horizontal y sombreado, estilo panel
  mecánico de los 70-80. Tinta oscura (`#16140f`→`#26241d`) con cifra crema.
  Al fijar un resultado, la ficha "se voltea" (micro-animación de flip).
- **Grano de papel** sutil — overlay de ruido SVG a baja opacidad sobre el crema.
- **Detalles de programa de partido**: número de partido tipo entrada ("Nº 07"),
  líneas de perforación (bordes discontinuos), sellos de goma para estados
  ("✓ Jugado", "Exacto").
- Sin disfraz: la app sigue siendo rapidísima de leer y usar.

### 2.5 Componentes base a rehacer / crear

Rehacer con el sistema nuevo: `button`, `card`, `badge`, `input`, `tabs`,
`dialog`, `select`, `switch`, `toast`.

Componentes nuevos:

- `<FlapTile>` — ficha de marcador abatible (estados: con valor / vacía / foco / volteo).
- `<ScorePad>` — teclado numérico 0–9 anclado abajo; auto-avance entre huecos/partidos.
- `<StageBar>` — barra fija de 4 fases con progreso.
- `<MatchCard>` — tarjeta de partido (variantes: predicción / resultado / en vivo).
- `<GroupChips>` — navegador horizontal de grupos A–L con estado ✓.
- `<StandingsTable>` — clasificación de grupo / ranking, con fichas de marcador.
- `<TieCard>` — cruce del cuadro, con trazabilidad a grupos origen.
- `<BreakdownBar>` — barra apilada de desglose de puntos (4 colores Mundial).
- `<PaperGrain>` — overlay de textura.

---

## 3. Arquitectura de información y navegación

### 3.1 Navegación inferior (4 destinos)

`Porra · Resultados · Ranking · Chat`

"Mi cuenta" se accede desde el avatar de la cabecera. El antiguo "dashboard" se
funde con el panel de la Porra.

### 3.2 La Porra como cascada de 4 fases

La porra es una cascada de dependencias:

```
Grupos (72 partidos) → Clasificados (1º/2º/3º) → Cuadro (32 cruces)
Premios (Bota/Balón/Guante) — independiente
```

Principios de navegación (resuelven la fricción que causa abandono):

1. **Las 4 fases siempre a un toque** — una **barra de fases fija** (`<StageBar>`)
   arriba: Grupos · Clasif. · Cuadro · Premios, cada una con su % de progreso y
   color. Se salta entre fases sin salir de "la Porra".
2. **Enlazado en los dos sentidos**:
   - Desde un grupo → la clasificación provisional dice a qué cruces van sus
     equipos, con salto directo al Cuadro.
   - Desde un cruce → indica de qué grupos sale; se puede editar el resultado del
     cruce o saltar al grupo que lo decide.
3. **"Atrás" nunca borra** — todo autoguarda al instante. Cambiar de fase, volver
   atrás o cerrar la app jamás pierde nada; la app devuelve al usuario donde
   estaba (grupo, fase, scroll). Nunca hay diálogo "¿seguro que quieres salir?".
   Indicador persistente "✓ Guardado" para generar confianza.

### 3.3 Inventario de pantallas

| Zona | Pantalla | Notas |
|---|---|---|
| Porra | Panel "Mi Porra" | Hub: % global, 4 fases con progreso, "seguir donde lo dejaste". |
| Porra | Grupos | Chips A–L, tarjetas de partido, clasificación viva, enlace al Cuadro. |
| Porra | Clasificados | 1º/2º/3º de cada grupo + mejores terceros; ajuste manual de empates. |
| Porra | Cuadro | Bracket por rondas (selector 16avos→Final); cruces con trazabilidad. |
| Porra | Premios | Bota / Balón / Guante de Oro. |
| Resultados | Partidos | Tu jornada (tarjeta clara) + en juego + jugados; real vs tu pronóstico + puntos. |
| Resultados | Grupos / Cuadro | Estado real del torneo (sub-pestañas). |
| Ranking | Clasificación | Lista B con movimiento ▲▼ + toggle Lista/Podio. |
| Chat | Chat | Restyle con el sistema nuevo. |
| Cuenta | Mi cuenta | Desde el avatar; restyle. |
| Auth | Login / Registro | Restyle. |
| Admin | Usuarios, Resultados, Premios, Jugadores, Chat, Configuración | Restyle con el mismo sistema. |

---

## 4. Flujos UX clave

### 4.1 Rellenar un resultado

`<ScorePad>` — teclado de marcador. El usuario toca una ficha abatible → sube un
panel 0–9 anclado abajo → cualquier cifra en un toque → la ficha se voltea →
auto-avance al siguiente hueco y siguiente partido. ~2 toques por partido.
**Autoguardado** inmediato, sin botón "guardar" por partido.

### 4.2 Rellenar la porra entera

Panel "Mi Porra" muestra el progreso de las 4 fases y lleva justo donde se dejó.
Dentro de Grupos: chips A–L para saltar, clasificación del grupo que se recalcula
sola con cada resultado.

### 4.3 El bucle sin fricción

Rellenar un grupo → "ver cruces" → ver el Cuadro formándose → no gusta un
emparejamiento → tocar "Grupo X" → cambiar un resultado (se guarda solo) → aviso
de qué cambió en el Cuadro → volver. Nunca se sale de "la Porra", nunca se pierde
nada.

### 4.4 Seguir el torneo

- **Resultados / Partidos**: tarjeta "Tu jornada" (puntos sumados, posición, tu
  boletín de aciertos del día). Cada partido jugado: resultado real (fichas
  abatibles) vs tu pronóstico + badge de puntos (Exacto +2 / Signo +1 / Fallo).
  Partidos en directo marcados en vivo.
- **Ranking**: lista única (oro/plata/bronce en el filo), **flecha de movimiento
  ▲▼ por fila**, tu fila desplegada como panel personal (desglose en barra
  apilada, distancia a rivales). **Toggle Lista/Podio** para ver el podio en modo
  celebración.

---

## 5. Enfoque técnico

- Rediseño sobre la app existente (Next.js 14 App Router + Tailwind). **Sin
  cambios de backend**; la capa mock (`NEXT_PUBLIC_MOCK`) se mantiene y permite la
  verificación visual.
- **Tema claro**: reemplazar las variables CSS de `globals.css` por los tokens de
  Crema & Tinta; quitar la clase `dark` forzada en `<html>` (`layout.tsx`).
- **Tailwind** (`tailwind.config.ts`): mapear los nuevos tokens y familias
  tipográficas; ajustar `borderRadius`.
- **Fuentes**: Rajdhani + Archivo vía `next/font/google` en `layout.tsx`.
- **Textura**: overlay global de grano de papel (ruido SVG) a baja opacidad.
- **Componentes**: rehacer los `ui/*` y crear los nuevos del §2.5.
- **Páginas**: reestructurar según la IA del §3 (hub Porra, StageBar, Resultados,
  Ranking). Se conserva toda la funcionalidad actual (autoguardado con debounce,
  cálculo de clasificaciones en vivo, puntuación, realtime de chat).
- **Banderas**: se mantiene el render por SVG (Twemoji) ya existente para Windows.

### Verificación

La app no tiene tests automatizados. La verificación es **visual, pantalla por
pantalla**, en el navegador con `NEXT_PUBLIC_MOCK=true` (datos de ejemplo del
Mundial 2026). Cada pantalla rediseñada se revisa en viewport móvil.

---

## 6. Fuera de alcance

- Cambios en el esquema de base de datos o en Supabase.
- Cambios en las reglas de puntuación o en la estructura de la porra (siguen
  siendo Grupos / Clasificados / Eliminatorias / Premios).
- Funcionalidad nueva más allá del rediseño.
- Configuración PWA (se mantiene).

---

## 7. Decisiones cerradas

- **Concepto**: Estadio en directo + toque retro.
- **Paleta**: Crema & Tinta 26 (claro; rojo CAN primario, verde MEX acierto,
  azul USA info, oro trofeo podio).
- **Tipografía**: Rajdhani (marcador) + Archivo (texto).
- **Retro**: dosis media — fichas abatibles, grano de papel, detalles de programa
  de partido.
- **Input de resultado**: teclado de marcador anclado, autoguardado, auto-avance.
- **Navegación de la Porra**: barra de 4 fases fija, enlazado bidireccional,
  "atrás" nunca borra.
- **Ranking**: lista única con movimiento ▲▼ por fila + toggle Lista/Podio.
