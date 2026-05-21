# Rediseño UX/UI — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar el rediseño visual y de UX completo (Crema & Tinta 26, tipografía de marcador, lenguaje retro, navegación de la Porra sin fricción) sobre la PWA Next.js existente, sin tocar backend.

**Architecture:** Restyle + reestructuración de la app Next.js 14 App Router. Se reemplaza el sistema de tokens (tema oscuro → claro Crema & Tinta), se crean componentes nuevos (ficha abatible, teclado de marcador, barra de fases, etc.) y se reescriben las pantallas según la nueva arquitectura de información. La capa mock (`NEXT_PUBLIC_MOCK=true`) permite verificar todo en el navegador sin backend.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Radix UI, `next/font` (Rajdhani + Archivo).

**Spec de referencia:** `docs/superpowers/specs/2026-05-21-rediseno-design.md`
**Maquetas de referencia (verdad visual):** `.superpowers/brainstorm/614-1779384666/content/*.html` — cada tarea de pantalla cita su maqueta.

**Verificación:** No hay tests automatizados. Cada tarea se verifica **visualmente** en el navegador con `npm run dev` y `NEXT_PUBLIC_MOCK=true`, en viewport móvil (~390px de ancho). El puerto puede variar (3000–3003); comprobar la salida de `npm run dev`.

---

## Estructura de ficheros

**Foundation (modificar):**
- `src/app/globals.css` — tokens Crema & Tinta, grano de papel, estilos base
- `tailwind.config.ts` — colores, fuentes, radios
- `src/app/layout.tsx` — fuentes, quitar `dark`, overlay de grano

**Componentes nuevos (crear):**
- `src/components/ui/flap-tile.tsx` — ficha de marcador abatible
- `src/components/porra/stage-bar.tsx` — barra de 4 fases
- `src/components/porra/group-chips.tsx` — navegador de grupos A–L
- `src/components/predictions/score-pad.tsx` — teclado de marcador anclado
- `src/components/predictions/match-card.tsx` — tarjeta de partido unificada
- `src/components/predictions/tie-card.tsx` — cruce del cuadro con trazabilidad
- `src/components/results/match-result-card.tsx` — partido jugado (real vs pronóstico)
- `src/components/results/tu-jornada-card.tsx` — resumen de jornada
- `src/components/ranking/breakdown-bar.tsx` — barra apilada de desglose
- `src/components/ranking/podium.tsx` — podio top-3
- `src/components/ranking/ranking-list.tsx` — lista de clasificación

**Componentes existentes (modificar):**
- `src/components/ui/*` — restyle al sistema nuevo
- `src/components/layout/navbar.tsx` — cabecera + nav inferior nueva
- `src/components/predictions/GroupMatchCard.tsx` — sustituido por `match-card.tsx`
- `src/components/predictions/GroupStandingsTable.tsx` — restyle
- `src/components/predictions/KnockoutBracket.tsx` — restyle (usa `tie-card.tsx`)

**Páginas (modificar/crear):** ver Fases 2–5.

---

## Fase 0 · Fundación

### Task 1: Tokens de diseño

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Reescribir `src/app/globals.css`**

Reemplazar el contenido completo por:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Lienzo y superficies */
    --cream: #F0ECE1;
    --surface: #FFFFFF;
    --surface-sunken: #F4F1E8;
    --border: #E4DFD0;
    /* Texto */
    --ink: #1A1A17;
    --ink-muted: #7C766A;
    --ink-faint: #A39C8C;
    /* Acentos del Mundial */
    --red: #DD352B;
    --red-strong: #C32E20;
    --green: #0E8A4A;
    --blue: #2C5BD6;
    --gold: #C6932F;
    --amber: #D98521;
    /* Ficha de marcador abatible */
    --flap-top: #26241D;
    --flap-bottom: #16140F;
    --flap-ink: #F2ECDD;
    --radius: 0.75rem;
  }
}

@layer base {
  * { @apply border-border; }
  body {
    @apply bg-cream text-ink;
    font-feature-settings: "tnum";
  }
}

/* Grano de papel — overlay global sutil */
.paper-grain::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.5;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E");
}

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--cream); }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--ink-faint); }

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
input[type="number"] { -moz-appearance: textfield; }
```

- [ ] **Step 2: Reescribir `tailwind.config.ts`**

Reemplazar el contenido completo por:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1100px" } },
    extend: {
      colors: {
        cream: "var(--cream)",
        surface: "var(--surface)",
        "surface-sunken": "var(--surface-sunken)",
        border: "var(--border)",
        ink: { DEFAULT: "var(--ink)", muted: "var(--ink-muted)", faint: "var(--ink-faint)" },
        red: { DEFAULT: "var(--red)", strong: "var(--red-strong)" },
        green: "var(--green)",
        blue: "var(--blue)",
        gold: "var(--gold)",
        amber: "var(--amber)",
        flap: { top: "var(--flap-top)", bottom: "var(--flap-bottom)", ink: "var(--flap-ink)" },
        input: "var(--border)",
        ring: "var(--red)",
      },
      fontFamily: {
        marcador: ["var(--font-rajdhani)", "sans-serif"],
        sans: ["var(--font-archivo)", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 3px)",
        sm: "calc(var(--radius) - 5px)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        flip: { "0%": { transform: "rotateX(-90deg)" }, "100%": { transform: "rotateX(0)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        flip: "flip 0.25s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
```

- [ ] **Step 3: Verificar build de Tailwind**

Run: `npm run dev`
Expected: compila sin errores de Tailwind. La app se verá rota de estilo (esperado — aún sin fuentes ni restyle); confirmar solo que **no hay errores de compilación**.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css tailwind.config.ts
git commit -m "feat(design): Crema & Tinta design tokens"
```

---

### Task 2: Fuentes y layout raíz

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Reescribir `src/app/layout.tsx`**

```tsx
import type { Metadata, Viewport } from "next";
import { Rajdhani, Archivo } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-rajdhani",
});
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-archivo",
});

export const metadata: Metadata = {
  title: "Porra del Mundial 2026",
  description: "App de pronósticos del Mundial FIFA 2026",
  manifest: "/manifest.json",
  icons: { icon: "/icons/icon-192x192.png", apple: "/icons/icon-192x192.png" },
};

export const viewport: Viewport = {
  themeColor: "#F0ECE1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${rajdhani.variable} ${archivo.variable}`}>
      <body className="font-sans antialiased min-h-screen paper-grain">
        <div className="relative z-[1]">{children}</div>
        <Toaster />
      </body>
    </html>
  );
}
```

Nota: se elimina `className="dark"` del `<html>` (tema claro) y el `themeColor` pasa a crema.

- [ ] **Step 2: Verificar fuentes y fondo**

Run: `npm run dev` y abrir la app en el navegador.
Expected: el fondo es crema (`#F0ECE1`), el texto usa Archivo, no hay errores. Las pantallas se verán a medio estilar (esperado).

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat(design): Rajdhani + Archivo fonts, light theme root layout"
```

---

## Fase 1 · Primitivas visuales y UI kit

### Task 3: Componente FlapTile (ficha de marcador abatible)

**Files:**
- Create: `src/components/ui/flap-tile.tsx`

- [ ] **Step 1: Crear `src/components/ui/flap-tile.tsx`**

```tsx
"use client";

import { cn } from "@/lib/utils";

interface FlapTileProps {
  value: number | null;
  size?: "sm" | "md" | "lg";
  focused?: boolean;
  className?: string;
}

const SIZES = {
  sm: "w-9 h-11 text-2xl",
  md: "w-11 h-14 text-3xl",
  lg: "w-[68px] h-[86px] text-6xl",
};

export function FlapTile({ value, size = "md", focused, className }: FlapTileProps) {
  return (
    <span
      key={value} /* re-mount on change → flip animation */
      className={cn(
        "relative inline-flex items-center justify-center rounded-md font-marcador font-bold animate-flip",
        "bg-gradient-to-b from-flap-top to-flap-bottom",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_4px_9px_-4px_rgba(0,0,0,0.55)]",
        value === null ? "text-flap-ink/35" : "text-flap-ink",
        focused && "ring-2 ring-red ring-offset-0",
        SIZES[size],
        className
      )}
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* costura horizontal del tablero */}
      <span className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 bg-black/60" />
      {value === null ? "·" : value}
    </span>
  );
}
```

- [ ] **Step 2: Verificar visualmente**

Importar temporalmente `<FlapTile value={2} />` en cualquier página visible, `npm run dev`, comprobar: ficha oscura, número crema, costura horizontal en el centro, esquinas redondeadas. Quitar el import temporal.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/flap-tile.tsx
git commit -m "feat(ui): split-flap scoreboard tile component"
```

---

### Task 4: Restyle de UI base (button, card, badge, input, label, separator)

**Files:**
- Modify: `src/components/ui/button.tsx`, `card.tsx`, `badge.tsx`, `input.tsx`, `label.tsx`, `separator.tsx`

- [ ] **Step 1: `button.tsx` — actualizar variantes**

Sustituir el `cva` de variantes por:

```ts
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-marcador font-bold uppercase tracking-wide ring-offset-cream transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-red text-white hover:bg-red-strong",
        outline: "border border-border bg-surface text-ink hover:bg-surface-sunken",
        secondary: "bg-ink text-cream hover:bg-ink/90",
        ghost: "text-ink-muted hover:bg-surface-sunken hover:text-ink",
        destructive: "bg-red text-white hover:bg-red-strong",
        link: "text-blue underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 text-sm",
        sm: "h-9 px-3 text-xs",
        lg: "h-13 px-7 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);
```

- [ ] **Step 2: `card.tsx` — superficie blanca**

En `Card`: `rounded-lg border border-border bg-surface text-ink shadow-[0_5px_14px_-11px_rgba(26,26,23,0.5)]`. Mantener la API de subcomponentes. `CardTitle`: `font-marcador font-bold uppercase tracking-wide`.

- [ ] **Step 3: `badge.tsx` — variantes de estado**

```ts
const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-marcador font-bold uppercase tracking-wide",
  {
    variants: {
      variant: {
        default: "bg-red text-white",
        secondary: "bg-surface-sunken text-ink-muted",
        outline: "border border-border text-ink-muted",
        success: "bg-green text-white",
        "success-soft": "bg-green/10 text-green border border-green/30",
        gold: "bg-gold/15 text-gold",
        info: "bg-blue/12 text-blue",
        destructive: "bg-red text-white",
      },
    },
    defaultVariants: { variant: "default" },
  }
);
```

- [ ] **Step 4: `input.tsx` — fondo claro**

Clase base: `flex h-11 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50`.

- [ ] **Step 5: `label.tsx` y `separator.tsx`**

`label.tsx`: `text-sm font-semibold text-ink`. `separator.tsx`: color `bg-border`.

- [ ] **Step 6: Verificar**

`npm run dev`, abrir `/login` (modo mock): el formulario debe verse con tarjeta blanca, inputs claros, botón rojo "Entrar" en mayúsculas con Rajdhani.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/button.tsx src/components/ui/card.tsx src/components/ui/badge.tsx src/components/ui/input.tsx src/components/ui/label.tsx src/components/ui/separator.tsx
git commit -m "feat(ui): restyle base components to Crema & Tinta"
```

---

### Task 5: Restyle de UI interactiva (tabs, dialog, select, switch, toast, scroll-area)

**Files:**
- Modify: `src/components/ui/tabs.tsx`, `dialog.tsx`, `select.tsx`, `switch.tsx`, `toast.tsx`, `toaster.tsx`, `scroll-area.tsx`

- [ ] **Step 1: Restyle**

Para cada componente, sustituir los colores antiguos (`bg-background`, `bg-muted`, `text-muted-foreground`, etc.) por los nuevos tokens:
- `tabs.tsx` — `TabsList`: `bg-surface-sunken`; `TabsTrigger` activo: `bg-red text-white`, inactivo: `text-ink-muted`. Texto `font-marcador uppercase`.
- `dialog.tsx` — `DialogContent`: `bg-surface border-border`. Overlay: `bg-ink/40`.
- `select.tsx` — trigger/content: `bg-surface border-border text-ink`.
- `switch.tsx` — activo: `bg-red`; thumb `bg-white`.
- `toast.tsx` / `toaster.tsx` — `bg-ink text-cream` (toast oscuro estilo marcador); variante destructive `bg-red`.
- `scroll-area.tsx` — scrollbar `bg-border`.

- [ ] **Step 2: Verificar**

`npm run dev`, abrir `/predicciones/grupos`: las pestañas de grupos deben usar el estilo nuevo (activa roja). Disparar un toast (guardar un resultado) y comprobar que sale oscuro.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/tabs.tsx src/components/ui/dialog.tsx src/components/ui/select.tsx src/components/ui/switch.tsx src/components/ui/toast.tsx src/components/ui/toaster.tsx src/components/ui/scroll-area.tsx
git commit -m "feat(ui): restyle interactive components to Crema & Tinta"
```

---

## Fase 2 · Shell de la app

### Task 6: Componente StageBar (barra de 4 fases)

**Files:**
- Create: `src/components/porra/stage-bar.tsx`

- [ ] **Step 1: Crear `src/components/porra/stage-bar.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const STAGES = [
  { key: "grupos", label: "Grupos", href: "/predicciones/grupos", color: "var(--red)" },
  { key: "clasificados", label: "Clasif.", href: "/predicciones/clasificados", color: "var(--blue)" },
  { key: "eliminatorias", label: "Cuadro", href: "/predicciones/eliminatorias", color: "var(--green)" },
  { key: "premios", label: "Premios", href: "/predicciones/premios", color: "var(--gold)" },
];

/** progress: mapa fase→porcentaje 0..100 */
export function StageBar({ progress }: { progress: Record<string, number> }) {
  const pathname = usePathname();
  return (
    <div className="flex gap-1.5 px-3 py-2">
      {STAGES.map((s) => {
        const active = pathname.startsWith(s.href);
        return (
          <Link
            key={s.key}
            href={s.href}
            className={cn(
              "flex-1 rounded-md border px-1 pt-1.5 text-center transition-colors",
              active ? "border-ink bg-ink" : "border-border bg-surface"
            )}
          >
            <span className={cn("font-marcador text-[11px] font-bold uppercase",
              active ? "text-white" : "text-ink-muted")}>
              {s.label}
            </span>
            <span className={cn("mx-1 my-1.5 block h-[3px] overflow-hidden rounded-sm",
              active ? "bg-white/20" : "bg-surface-sunken")}>
              <span className="block h-full rounded-sm"
                style={{ width: `${progress[s.key] ?? 0}%`, background: s.color }} />
            </span>
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verificar**

Render temporal en `/predicciones/grupos` con `progress={{grupos:75,clasificados:66,eliminatorias:37,premios:100}}`. Comprobar: 4 pestañas, la activa en tinta, barritas de progreso de colores. Quitar el render temporal.

- [ ] **Step 3: Commit**

```bash
git add src/components/porra/stage-bar.tsx
git commit -m "feat(porra): persistent 4-stage navigation bar"
```

---

### Task 7: Navbar (cabecera + nav inferior) y layout (app)

**Files:**
- Modify: `src/components/layout/navbar.tsx`
- Modify: `src/app/(app)/layout.tsx`
- Modify: `src/middleware.ts` (lista de rutas — ver Step 3)
- Create: `src/app/(app)/resultados/page.tsx` (placeholder; se completa en Task 19)

**Maqueta de referencia:** cabecera y nav inferior en `la-porra.html` y `navegabilidad.html`.

- [ ] **Step 1: Reescribir `navbar.tsx`**

Dos piezas: una **cabecera fija** (logo "Mundial '26" con `'26` en rojo, a la derecha el avatar con la inicial que enlaza a `/mi-cuenta`) y una **nav inferior fija** de 4 destinos: Porra (`/porra`), Resultados (`/resultados`), Ranking (`/ranking`), Chat (`/chat`). Item activo en `text-red`; resto `text-ink-faint`. Etiquetas `font-marcador uppercase text-[10px]`. La cabecera incluye un chip "✓ Guardado" (prop opcional `saved?: boolean`). Mantener `isAdmin` → enlace extra a `/admin/usuarios` en la cabecera. El logout pasa a `/mi-cuenta` (no en la nav inferior).

- [ ] **Step 2: Actualizar `src/app/(app)/layout.tsx`**

Mantener la lógica de `createClient()` / `getUser` / `isAdmin`. Cambiar el contenedor: `main` con `className="mx-auto max-w-[680px] px-4 pb-24 pt-16"` (hueco para cabecera fija arriba y nav inferior abajo). Pasar `isAdmin` al `Navbar`.

- [ ] **Step 3: Actualizar rutas en `src/middleware.ts`**

En `updateSession` (`src/lib/supabase/middleware.ts`), añadir `/porra` y `/resultados` a `isAppRoute`. (En modo mock el middleware se salta; este cambio es para el modo Supabase real.)

- [ ] **Step 4: Crear placeholder `src/app/(app)/resultados/page.tsx`**

```tsx
export default function ResultadosPage() {
  return <div className="font-marcador text-2xl uppercase">Resultados</div>;
}
```

- [ ] **Step 5: Verificar**

`npm run dev`, abrir cualquier ruta `(app)`: cabecera fija arriba, nav inferior de 4 iconos abajo, contenido centrado con márgenes. Navegar entre los 4 destinos.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/navbar.tsx "src/app/(app)/layout.tsx" src/lib/supabase/middleware.ts "src/app/(app)/resultados/page.tsx"
git commit -m "feat(shell): new header + bottom navigation"
```

---

## Fase 3 · La Porra (rellenar)

### Task 8: Componente ScorePad (teclado de marcador)

**Files:**
- Create: `src/components/predictions/score-pad.tsx`

**Maqueta:** opción B de `input-retro.html`.

- [ ] **Step 1: Crear `src/components/predictions/score-pad.tsx`**

Componente cliente. Props:
```ts
interface ScorePadProps {
  open: boolean;
  teamName: string;        // equipo cuyo marcador se edita
  flag: React.ReactNode;   // <Flag> del equipo
  onDigit: (n: number) => void;
  onClose: () => void;
}
```
Render: panel `fixed bottom-0 left-0 right-0 z-50 bg-ink rounded-t-2xl p-3 pb-4` (ancho máx. centrado igual que el layout). Cabecera con la bandera + "Goles de **{teamName}**" (`text-cream`, el nombre en `text-red/80`). Rejilla `grid grid-cols-5 gap-1.5` con teclas 0–9: cada tecla `h-9 rounded-md bg-[#2c2b26] text-cream font-marcador text-lg`, `onClick={() => onDigit(n)}`. Si `!open`, no renderiza nada.

- [ ] **Step 2: Verificar**

Render temporal con `open`, comprobar el panel anclado abajo con las 10 teclas. Quitar.

- [ ] **Step 3: Commit**

```bash
git add src/components/predictions/score-pad.tsx
git commit -m "feat(predictions): docked scoreboard number pad"
```

---

### Task 9: Componente MatchCard

**Files:**
- Create: `src/components/predictions/match-card.tsx`
- (`GroupMatchCard.tsx` quedará obsoleto; se elimina en Task 12)

**Maqueta:** tarjetas de partido en `la-porra.html` / `navegabilidad.html`.

- [ ] **Step 1: Crear `src/components/predictions/match-card.tsx`**

Componente cliente. Tarjeta de partido de dos filas (equipos arriba, fichas de marcador abajo). Props:
```ts
interface MatchCardProps {
  matchNumber: number;
  matchDate?: string;
  homeTeam: { name: string; flag_emoji: string };
  awayTeam: { name: string; flag_emoji: string };
  homeScore: number | null;
  awayScore: number | null;
  saved?: boolean;
  active?: boolean;          // resalte cuando se está editando
  focusedSide?: "home" | "away" | null;
  onTileTap: (side: "home" | "away") => void;
}
```
Estructura: `div` tarjeta (`bg-surface border border-border rounded-xl p-2.5`, si `active` → `border-red ring-[3px] ring-red/12`). Meta: `Nº {NN} · {fecha}` (`font-marcador`, número con padding cero a 2 dígitos), si `saved` añadir "· ✓ guardado" en `text-green`. Fila de equipos: `<Flag>` (componente existente `@/components/ui/flag`) + nombre, lado `away` invertido (`flex-row-reverse`). Fila de fichas: dos `<FlapTile>` centradas, cada una con `onClick={() => onTileTap(side)}` y `focused={focusedSide === side}`.

- [ ] **Step 2: Verificar**

Render temporal con datos de ejemplo. Comprobar tarjeta de dos filas, banderas, fichas abatibles.

- [ ] **Step 3: Commit**

```bash
git add src/components/predictions/match-card.tsx
git commit -m "feat(predictions): unified two-row MatchCard with flap tiles"
```

---

### Task 10: Componente GroupChips

**Files:**
- Create: `src/components/porra/group-chips.tsx`

- [ ] **Step 1: Crear `src/components/porra/group-chips.tsx`**

```tsx
"use client";

import { cn } from "@/lib/utils";

const GROUPS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

interface GroupChipsProps {
  current: string;
  done: string[];                 // grupos completos
  onSelect: (g: string) => void;
}

export function GroupChips({ current, done, onSelect }: GroupChipsProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto px-1 py-1">
      {GROUPS.map((g) => {
        const isDone = done.includes(g);
        const isCur = g === current;
        return (
          <button
            key={g}
            onClick={() => onSelect(g)}
            className={cn(
              "relative h-7 w-7 shrink-0 rounded-md border font-marcador text-sm font-bold",
              isCur ? "border-ink bg-ink text-cream"
                : isDone ? "border-green/40 bg-surface text-green"
                : "border-border bg-surface text-ink-faint"
            )}
          >
            {g}
            {isDone && !isCur && (
              <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-green text-[7px] text-white">✓</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verificar y commit**

Render temporal, comprobar la fila de chips A–L. Quitar.

```bash
git add src/components/porra/group-chips.tsx
git commit -m "feat(porra): group A-L navigator chips"
```

---

### Task 11: Página — Panel "Mi Porra"

**Files:**
- Create: `src/app/(app)/porra/page.tsx`
- Modify: `src/app/page.tsx` (redirige a `/porra`)
- Modify: `src/app/(app)/dashboard/page.tsx` (redirige a `/porra`)

**Maqueta:** phone 1 de `la-porra.html` (hub).

- [ ] **Step 1: Crear `src/app/(app)/porra/page.tsx`**

Server component. Reutilizar las consultas del actual `dashboard/page.tsx` (perfil, `tournament_config`, `match_predictions` count, `user_scores`) y además contar progreso por fase:
- Grupos: nº de `match_predictions` de partidos `stage='group'` / 72.
- Clasificados: nº de grupos con `predicted_group_standings` completos / 12.
- Eliminatorias: nº de `match_predictions` de partidos knockout / 32.
- Premios: nº de `award_predictions` / 3.

Layout (ver maqueta):
1. Saludo "Hola, {display_name}." + subtítulo con la posición.
2. Tarjeta de progreso global: `%` grande (`font-marcador`), barra, fecha de cierre (`lock_datetime`) y cuenta atrás en días.
3. Cuatro tarjetas de fase (Grupos/Clasif./Cuadro/Premios), cada una con icono en su color, contador "X / Y", barra de progreso y enlace a `/predicciones/<fase>`.
4. Botón primario "Seguir rellenando" → enlaza a la primera fase incompleta.

Usar `<Card>`, `<Badge>`. Recordatorio Bizum si `!has_paid` (tarjeta con borde `gold`).

- [ ] **Step 2: Redirecciones**

`src/app/page.tsx`: `redirect("/porra")`. `src/app/(app)/dashboard/page.tsx`: reemplazar todo el contenido por `import { redirect } from "next/navigation"; export default function () { redirect("/porra"); }`.

- [ ] **Step 3: Verificar**

`npm run dev`, abrir `/` → debe redirigir a `/porra`. Comprobar el panel contra la maqueta: progreso global, 4 tarjetas de fase con colores, botón rojo.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/porra/page.tsx" src/app/page.tsx "src/app/(app)/dashboard/page.tsx"
git commit -m "feat(porra): Mi Porra hub page"
```

---

### Task 12: Página — Grupos

**Files:**
- Modify: `src/app/(app)/predicciones/grupos/page.tsx`
- Delete: `src/components/predictions/GroupMatchCard.tsx`

**Maqueta:** phone 2 de `la-porra.html` y `navegabilidad.html` (phone A).

- [ ] **Step 1: Reescribir `grupos/page.tsx`**

Mantener TODA la lógica de datos existente (carga de teams/matches/predictions/config, `calculateGroupStandings`, autoguardado con debounce vía `savePrediction`, `saveStandings`). Cambios de UI/UX:
- Sustituir la cabecera y las `Tabs` de 12 grupos por: `<StageBar>` (con el progreso real), título "Grupo X" + `<GroupChips>` para cambiar de grupo (estado en `useState`, ya no `Tabs`).
- Sustituir `<GroupMatchCard>` por `<MatchCard>`.
- Integrar `<ScorePad>`: estado `{ matchId, side } | null` del hueco en edición; al pulsar una ficha (`onTileTap`) se abre el pad; `onDigit` fija el valor (llama a `handleScoreChange`), voltea la ficha y auto-avanza al siguiente hueco/partido; al terminar el grupo, cierra el pad.
- Bajo los partidos del grupo, la `<GroupStandingsTable>` (clasificación viva) y un bloque cross-link "Estos 2 van al cuadro → Ver cruces" enlazando a `/predicciones/eliminatorias`.
- Botones inferiores: "‹ Grupo anterior" / "Grupo siguiente ›".
- Eliminar el botón "Guardar Clasificaciones" como acción manual obligatoria: `saveStandings` se llama automáticamente (debounce) cuando cambian las predicciones del grupo.

- [ ] **Step 2: Eliminar `GroupMatchCard.tsx`**

```bash
git rm src/components/predictions/GroupMatchCard.tsx
```

- [ ] **Step 3: Verificar**

`npm run dev`, abrir `/predicciones/grupos`. Comprobar: StageBar arriba, chips A–L, tarjetas `MatchCard`, tocar una ficha abre el ScorePad anclado, meter un número voltea la ficha y avanza, la clasificación del grupo se recalcula. Cambiar de grupo con los chips.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/predicciones/grupos/page.tsx"
git commit -m "feat(porra): redesigned Grupos screen with scorepad flow"
```

---

### Task 13: Restyle GroupStandingsTable

**Files:**
- Modify: `src/components/predictions/GroupStandingsTable.tsx`

- [ ] **Step 1: Restyle**

Mantener la lógica (orden, empates `tiedTeamIds`, `onMoveTeam`). UI: tabla sobre `bg-surface`, cabecera `# Equipo PJ DG PTS` en `font-marcador` minúsculas-mayúsculas tenue. Filas con bandera + nombre; posiciones 1–2 (clasifican) con `text-green`; columnas numéricas en `font-marcador`. Fila resaltada para equipos empatados con borde `amber`. Flechas de reordenado manual como botones `ghost`.

- [ ] **Step 2: Verificar y commit**

Comprobar en `/predicciones/grupos`.
```bash
git add src/components/predictions/GroupStandingsTable.tsx
git commit -m "feat(porra): restyle group standings table"
```

---

### Task 14: Página — Clasificados

**Files:**
- Modify: `src/app/(app)/predicciones/clasificados/page.tsx`

- [ ] **Step 1: Reescribir**

Mantener la lógica de datos. UI: `<StageBar>` arriba. Mostrar los 12 grupos con su 1º/2º/3º (de `predicted_group_standings`), y la tabla de los 8 mejores terceros. Cada grupo enlaza de vuelta a `/predicciones/grupos` (cross-link "editar resultados"). Tarjetas `bg-surface`, posiciones con sus colores, banderas con `<Flag>`.

- [ ] **Step 2: Verificar y commit**

Comprobar `/predicciones/clasificados`.
```bash
git add "src/app/(app)/predicciones/clasificados/page.tsx"
git commit -m "feat(porra): redesigned Clasificados screen"
```

---

### Task 15: Componente TieCard y página Cuadro

**Files:**
- Create: `src/components/predictions/tie-card.tsx`
- Modify: `src/app/(app)/predicciones/eliminatorias/page.tsx`
- Modify: `src/components/predictions/KnockoutBracket.tsx`

**Maqueta:** phone B de `navegabilidad.html`.

- [ ] **Step 1: Crear `tie-card.tsx`**

Tarjeta de cruce. Props: nº de cruce, ronda, los dos contendientes (cada uno con etiqueta de origen "1º Gr. A", equipo resuelto `{name, flag}` o placeholder "Por decidir"), marcador con dos `<FlapTile size="sm">`, estado `selected`. Si `selected`, panel de trazabilidad: texto "Sale de: 1º Grupo A · 2º Grupo C" + acciones (Editar resultado, enlaces "Grupo A ›" / "Grupo C ›" a `/predicciones/grupos`). Cruce sin resolver → borde discontinuo, fichas placeholder.

- [ ] **Step 2: Reescribir `eliminatorias/page.tsx`**

Mantener la lógica (carga teams/matches/standings/bracket positions/predictions, `resolveBracket`). UI: `<StageBar>` + selector de rondas (16avos / Octavos / Cuartos / Semis / Final) en `useState`; lista vertical de `<TieCard>` de la ronda activa; `<ScorePad>` para editar el marcador de un cruce; autoguardado.

- [ ] **Step 3: Restyle `KnockoutBracket.tsx`**

Adaptar a tokens nuevos si se sigue usando como vista auxiliar; si la página ya no lo usa, eliminarlo (`git rm`) y quitar el import.

- [ ] **Step 4: Verificar y commit**

Comprobar `/predicciones/eliminatorias`: selector de rondas, tarjetas de cruce, trazabilidad, ScorePad.
```bash
git add src/components/predictions/tie-card.tsx "src/app/(app)/predicciones/eliminatorias/page.tsx" src/components/predictions/KnockoutBracket.tsx
git commit -m "feat(porra): redesigned Cuadro screen with traceable tie cards"
```

---

### Task 16: Página — Premios

**Files:**
- Modify: `src/app/(app)/predicciones/premios/page.tsx`

- [ ] **Step 1: Reescribir**

Mantener la lógica (carga `players` / `award_predictions` / config, `upsert`). UI: `<StageBar>` arriba. Tres tarjetas — Bota de Oro, Balón de Oro, Guante de Oro — cada una con icono en `gold`, un selector de jugador (`<Select>`) y el jugador elegido. Autoguardado.

- [ ] **Step 2: Verificar y commit**

Comprobar `/predicciones/premios`.
```bash
git add "src/app/(app)/predicciones/premios/page.tsx"
git commit -m "feat(porra): redesigned Premios screen"
```

---

## Fase 4 · Seguir el torneo

### Task 17: Componentes de Ranking (BreakdownBar, Podium, RankingList)

**Files:**
- Create: `src/components/ranking/breakdown-bar.tsx`
- Create: `src/components/ranking/podium.tsx`
- Create: `src/components/ranking/ranking-list.tsx`

**Maqueta:** `ranking-final.html`.

- [ ] **Step 1: Crear `breakdown-bar.tsx`**

Barra apilada horizontal del desglose de puntos. Props: `{ grupos: number; cuadro: number; clasif: number; premios: number }`. Render: barra `h-2.5 rounded-md overflow-hidden flex`, cuatro segmentos con anchos proporcionales al total y colores `red / green / blue / gold`. Debajo, leyenda con 4 items "● Etiqueta valor".

- [ ] **Step 2: Crear `podium.tsx`**

Podio top-3. Props: array de `{ name; points; movement; isYou }`. Render: tres escalones (2º-1º-3º), alturas distintas, oro/plata/bronce, avatar con inicial, nombre, puntos, `▲▼` de movimiento. El escalón `isYou` con `outline` rojo y etiqueta "TÚ".

- [ ] **Step 3: Crear `ranking-list.tsx`**

Lista de clasificación (enfoque B). Props: array de jugadores `{ position; movement; name; points; breakdown; isYou; gapInfo }`. Cada fila: posición, flecha de movimiento (`▲n` verde / `▼n` rojo / `=` gris), avatar+nombre, total. Filas 1-3 con filo oro/plata/bronce. La fila `isYou` se expande a una mini-ficha: borde rojo, `<BreakdownBar>` y línea de distancia a rivales (`gapInfo`).

- [ ] **Step 4: Verificar y commit**

Render temporal de cada uno con datos de ejemplo.
```bash
git add src/components/ranking/
git commit -m "feat(ranking): podium, ranking list and breakdown bar components"
```

---

### Task 18: Página — Ranking

**Files:**
- Modify: `src/app/(app)/ranking/page.tsx`

**Maqueta:** `ranking-final.html` (ambos estados del toggle).

- [ ] **Step 1: Reescribir**

Mantener la lógica (carga `user_scores` + `profiles`, filtro `has_paid`, suscripción realtime). Calcular el movimiento por jornada (si no hay dato histórico, mostrar `=`). UI:
- Título "Clasificación".
- Toggle `Lista | Podio` (`useState`).
- Modo **Lista**: `<RankingList>` con la fila propia expandida.
- Modo **Podio**: `<Podium>` + tarjeta resumen propia (`<BreakdownBar>`, distancia al 2º) + el resto en tabla.
- Identificar al usuario actual (`isYou`) con `currentUserId`.

- [ ] **Step 2: Verificar y commit**

Comprobar `/ranking`: toggle funciona, lista con movimiento, fila propia expandida.
```bash
git add "src/app/(app)/ranking/page.tsx"
git commit -m "feat(ranking): redesigned Ranking screen with list/podium toggle"
```

---

### Task 19: Página — Resultados

**Files:**
- Modify: `src/app/(app)/resultados/page.tsx`
- Create: `src/components/results/tu-jornada-card.tsx`
- Create: `src/components/results/match-result-card.tsx`

**Maqueta:** phone 1 de `seguir-v2.html`.

- [ ] **Step 1: Crear `tu-jornada-card.tsx`**

Tarjeta blanca "Tu jornada N". Props: `{ jornada; puntos; posicion; movimiento; boletin: {tipo:'exacto'|'signo'|'fallo', puntos:number}[] }`. Render: `+{puntos}` grande en `text-green`, posición como medalla suave (chip `bg-gold/10`), línea perforada y "boletín de hoy" — fila de mini-fichas por resultado (exacto verde, signo verde-suave, fallo gris).

- [ ] **Step 2: Crear `match-result-card.tsx`**

Tarjeta de partido jugado o en vivo. Props: equipos, marcador real (dos `<FlapTile>`), estado (`live` con minuto / `finished`), pronóstico del usuario y badge de puntos (`<Badge variant="success">✓ Exacto +2`, `success-soft` Signo, `secondary` Fallo). Strip inferior con línea perforada: "Tu pronóstico: X-Y" + badge.

- [ ] **Step 3: Reescribir `resultados/page.tsx`**

Server o client component que cargue `matches` (con `home_score`/`away_score`/`is_finished`), `match_predictions` del usuario y `user_scores`. UI: `<TuJornadaCard>` arriba; sub-pestañas `Partidos | Grupos | Cuadro`; en "Partidos", secciones "En juego" y "Jugados" con `<MatchResultCard>`. "Grupos" y "Cuadro" muestran el estado real (reutilizar `<GroupStandingsTable>` y `<TieCard>` con datos reales). El cálculo de puntos por partido reutiliza la lógica de `src/lib/scoring/*`.

- [ ] **Step 4: Verificar y commit**

Comprobar `/resultados`.
```bash
git add "src/app/(app)/resultados/page.tsx" src/components/results/
git commit -m "feat(results): Resultados tracking screen"
```

---

## Fase 5 · Pantallas secundarias

### Task 20: Página — Chat

**Files:**
- Modify: `src/app/(app)/chat/page.tsx`

- [ ] **Step 1: Restyle**

Mantener TODA la lógica (carga de mensajes, realtime INSERT/UPDATE, envío, baneo). UI: burbujas propias `bg-red text-white`, ajenas `bg-surface border border-border`; nombre+hora en `text-ink-faint`; input inferior con el estilo nuevo; cabecera "Chat" en `font-marcador`.

- [ ] **Step 2: Verificar y commit**

Comprobar `/chat`: enviar un mensaje (en mock aparece vía realtime simulado).
```bash
git add "src/app/(app)/chat/page.tsx"
git commit -m "feat(chat): restyle chat screen"
```

---

### Task 21: Página — Mi cuenta

**Files:**
- Modify: `src/app/(app)/mi-cuenta/page.tsx`

- [ ] **Step 1: Restyle**

Mantener la lógica (carga de perfil, edición de `display_name`, logout). UI: tarjeta de perfil con avatar de inicial, campo de nombre editable, estado de pago (`Badge` `success`/`amber`), botón de cerrar sesión (`variant="outline"`).

- [ ] **Step 2: Verificar y commit**

```bash
git add "src/app/(app)/mi-cuenta/page.tsx"
git commit -m "feat(account): restyle Mi cuenta screen"
```

---

### Task 22: Auth — login, registro y layout

**Files:**
- Modify: `src/app/(auth)/layout.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`

- [ ] **Step 1: Restyle `(auth)/layout.tsx`**

Fondo crema, centrado, cabecera con el logo "Mundial '26" (Rajdhani, `'26` en rojo) y subtítulo "USA · México · Canadá".

- [ ] **Step 2: Restyle login y register**

Mantener la lógica (`signInWithPassword`, `signUp`). UI: `<Card>` blanca, inputs y labels nuevos, botón rojo, enlaces en `text-blue`.

- [ ] **Step 3: Verificar y commit**

Comprobar `/login` y `/register`.
```bash
git add "src/app/(auth)/"
git commit -m "feat(auth): restyle login and register screens"
```

---

### Task 23: Admin — layout y páginas

**Files:**
- Modify: `src/app/(admin)/layout.tsx` y las 6 páginas en `src/app/(admin)/admin/**`

- [ ] **Step 1: Restyle layout admin**

Cabecera "Panel Admin" con el sistema nuevo, navegación admin con tokens nuevos.

- [ ] **Step 2: Restyle las 6 páginas**

`usuarios`, `resultados`, `resultados/premios`, `jugadores`, `chat`, `configuracion`: mantener toda la lógica; sustituir colores y componentes por el sistema nuevo (tarjetas `bg-surface`, tablas estilo marcador, badges de estado, botones nuevos). Donde se introduzcan marcadores reales, usar `<FlapTile>`.

- [ ] **Step 3: Verificar y commit**

Comprobar cada ruta `/admin/*` (el usuario mock es admin).
```bash
git add "src/app/(admin)/"
git commit -m "feat(admin): restyle admin panel"
```

---

## Cierre

### Task 24: Repaso visual completo y limpieza

- [ ] **Step 1: Recorrer todas las rutas**

`npm run dev`, en viewport móvil (~390px) recorrer: `/porra`, `/predicciones/{grupos,clasificados,eliminatorias,premios}`, `/resultados`, `/ranking`, `/chat`, `/mi-cuenta`, `/login`, `/register`, `/admin/*`. Anotar incoherencias visuales y corregirlas.

- [ ] **Step 2: Comprobar que no quedan tokens antiguos**

Buscar en `src/` referencias a clases muertas (`bg-background`, `text-muted-foreground`, `hsl(var(`, `--gold` antiguo, `dark:`) y migrarlas o eliminarlas.

- [ ] **Step 3: Commit final**

```bash
git add -A
git commit -m "chore: visual QA pass and cleanup"
```

---

## Self-review (revisado)

- **Cobertura del spec:** §2 sistema de diseño → Tasks 1–5; §3 IA/navegación → Tasks 6,7,11,12,15; §4 flujos → Tasks 8,12,15,19,18; pantallas del inventario → Tasks 11–23. Cubierto.
- **Sin placeholders:** las tareas de fundación y componentes llevan código completo; las de pantalla referencian su maqueta exacta y conservan la lógica existente descrita explícitamente.
- **Consistencia de tipos:** `FlapTile`, `ScorePad`, `StageBar`, `GroupChips`, `MatchCard`, `TieCard`, `BreakdownBar`, `Podium`, `RankingList` — nombres y props usados de forma consistente entre la tarea que los define y las que los consumen.
