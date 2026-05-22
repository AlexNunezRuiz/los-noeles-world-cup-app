/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { createClient } from "@/lib/supabase/client";

// Caché en memoria (por sesión de navegador) de los datos del torneo que no
// cambian: equipos, sedes y posiciones del cuadro. Antes se rebajaban de
// Supabase en cada navegación a cada pantalla; ahora se piden una sola vez y
// se reutilizan. La promesa se memoiza, así que llamadas concurrentes desde
// varias pantallas comparten la misma petición.

let teamsPromise: Promise<any[]> | undefined;
let venuesPromise: Promise<any[]> | undefined;
let bracketPositionsPromise: Promise<any[]> | undefined;

/** Ejecuta una query del builder de Supabase y devuelve solo las filas. */
async function rows(query: any): Promise<any[]> {
  const { data } = await query;
  return data ?? [];
}

export function getTeams(): Promise<any[]> {
  teamsPromise ??= rows(
    createClient().from("teams").select("*").order("id")
  );
  return teamsPromise;
}

export function getVenues(): Promise<any[]> {
  venuesPromise ??= rows(createClient().from("venues").select("*"));
  return venuesPromise;
}

export function getBracketPositions(): Promise<any[]> {
  bracketPositionsPromise ??= rows(
    createClient().from("knockout_bracket_positions").select("*")
  );
  return bracketPositionsPromise;
}
