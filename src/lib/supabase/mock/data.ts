/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================
// MOCK DATA — Porra del Mundial 2026
// In-memory seed used when NEXT_PUBLIC_MOCK=true so the app
// runs without a real Supabase backend (for UX/UI work).
// Mirrors supabase/seed.sql + supabase/migrations/001_initial_schema.sql
// ============================================================

export type Row = Record<string, any>;
export type Db = Record<string, Row[]>;

// Stable mock identity. The "logged-in" user for the whole session.
export const MOCK_USER_ID = "00000000-0000-4000-8000-000000000001";

export const MOCK_USER = {
  id: MOCK_USER_ID,
  aud: "authenticated",
  role: "authenticated",
  email: "noe@noeles.com",
  email_confirmed_at: "2026-01-01T00:00:00Z",
  phone: "",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { display_name: "Noé" },
  identities: [],
};

const nowIso = () => new Date().toISOString();

// ---------------------------------------------------------------
// TEAMS (48) — from seed.sql
// ---------------------------------------------------------------
const TEAM_DEFS: [string, string, string, string][] = [
  ["Marruecos", "MAR", "🇲🇦", "A"], ["Perú", "PER", "🇵🇪", "A"],
  ["Canadá", "CAN", "🇨🇦", "A"], ["Australia", "AUS", "🇦🇺", "A"],
  ["España", "ESP", "🇪🇸", "B"], ["Bolivia", "BOL", "🇧🇴", "B"],
  ["Croacia", "CRO", "🇭🇷", "B"], ["Nueva Zelanda", "NZL", "🇳🇿", "B"],
  ["Francia", "FRA", "🇫🇷", "C"], ["Colombia", "COL", "🇨🇴", "C"],
  ["Arabia Saudita", "KSA", "🇸🇦", "C"], ["Corea del Sur", "KOR", "🇰🇷", "C"],
  ["Japón", "JPN", "🇯🇵", "D"], ["Serbia", "SRB", "🇷🇸", "D"],
  ["Costa Rica", "CRC", "🇨🇷", "D"], ["Irán", "IRN", "🇮🇷", "D"],
  ["Brasil", "BRA", "🇧🇷", "E"], ["Ecuador", "ECU", "🇪🇨", "E"],
  ["Nigeria", "NGA", "🇳🇬", "E"], ["Turquía", "TUR", "🇹🇷", "E"],
  ["México", "MEX", "🇲🇽", "F"], ["Honduras", "HON", "🇭🇳", "F"],
  ["Senegal", "SEN", "🇸🇳", "F"], ["Uruguay", "URU", "🇺🇾", "F"],
  ["Argentina", "ARG", "🇦🇷", "G"], ["Chile", "CHI", "🇨🇱", "G"],
  ["Uzbekistán", "UZB", "🇺🇿", "G"], ["Dinamarca", "DEN", "🇩🇰", "G"],
  ["EE.UU.", "USA", "🇺🇸", "H"], ["Gales", "WAL", "🏴󠁧󠁢󠁷󠁬󠁳󠁿", "H"],
  ["Panamá", "PAN", "🇵🇦", "H"], ["Camerún", "CMR", "🇨🇲", "H"],
  ["Portugal", "POR", "🇵🇹", "I"], ["Guatemala", "GUA", "🇬🇹", "I"],
  ["Alemania", "GER", "🇩🇪", "I"], ["Suiza", "SUI", "🇨🇭", "I"],
  ["Países Bajos", "NED", "🇳🇱", "J"], ["Ghana", "GHA", "🇬🇭", "J"],
  ["Paraguay", "PAR", "🇵🇾", "J"], ["Egipto", "EGY", "🇪🇬", "J"],
  ["Inglaterra", "ENG", "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "K"], ["Bélgica", "BEL", "🇧🇪", "K"],
  ["Jamaica", "JAM", "🇯🇲", "K"], ["Argelia", "ALG", "🇩🇿", "K"],
  ["Italia", "ITA", "🇮🇹", "L"], ["Albania", "ALB", "🇦🇱", "L"],
  ["R.P. del Congo", "COD", "🇨🇩", "L"], ["Bahréin", "BHR", "🇧🇭", "L"],
];

function buildTeams(): Row[] {
  return TEAM_DEFS.map(([name, code, flag_emoji, group_letter], i) => ({
    id: i + 1,
    name,
    code,
    flag_emoji,
    group_letter,
    created_at: "2026-01-01T00:00:00Z",
  }));
}

// ---------------------------------------------------------------
// MATCHES (104) — 72 group + 32 knockout
// ---------------------------------------------------------------
// Per group: M1:1v2, M2:3v4, M3:1v3, M4:2v4, M5:1v4, M6:2v3
const GROUP_PATTERN: [number, number][] = [
  [1, 2], [3, 4], [1, 3], [2, 4], [1, 4], [2, 3],
];

// Official 2026 FIFA World Cup R32 per-match definitions (matches 73..88)
// Each entry: [home_source_type, home_ref, away_source_type, away_ref]
// source types: "W" = group_winner, "R" = group_runner_up, "T" = best_third pool string
type R32Slot = { type: "W" | "R" | "T"; ref: string };
const R32_MATCHES: [R32Slot, R32Slot][] = [
  // 73: R:A vs R:B
  [{ type: "R", ref: "A" }, { type: "R", ref: "B" }],
  // 74: W:E vs T:A,B,C,D,F
  [{ type: "W", ref: "E" }, { type: "T", ref: "A,B,C,D,F" }],
  // 75: W:F vs R:C
  [{ type: "W", ref: "F" }, { type: "R", ref: "C" }],
  // 76: W:C vs R:F
  [{ type: "W", ref: "C" }, { type: "R", ref: "F" }],
  // 77: W:I vs T:C,D,F,G,H
  [{ type: "W", ref: "I" }, { type: "T", ref: "C,D,F,G,H" }],
  // 78: R:E vs R:I
  [{ type: "R", ref: "E" }, { type: "R", ref: "I" }],
  // 79: W:A vs T:C,E,F,H,I
  [{ type: "W", ref: "A" }, { type: "T", ref: "C,E,F,H,I" }],
  // 80: W:L vs T:E,H,I,J,K
  [{ type: "W", ref: "L" }, { type: "T", ref: "E,H,I,J,K" }],
  // 81: W:D vs T:B,E,F,I,J
  [{ type: "W", ref: "D" }, { type: "T", ref: "B,E,F,I,J" }],
  // 82: W:G vs T:A,E,H,I,J
  [{ type: "W", ref: "G" }, { type: "T", ref: "A,E,H,I,J" }],
  // 83: R:K vs R:L
  [{ type: "R", ref: "K" }, { type: "R", ref: "L" }],
  // 84: W:H vs R:J
  [{ type: "W", ref: "H" }, { type: "R", ref: "J" }],
  // 85: W:B vs T:E,F,G,I,J
  [{ type: "W", ref: "B" }, { type: "T", ref: "E,F,G,I,J" }],
  // 86: W:J vs R:H
  [{ type: "W", ref: "J" }, { type: "R", ref: "H" }],
  // 87: W:K vs T:D,E,I,J,L
  [{ type: "W", ref: "K" }, { type: "T", ref: "D,E,I,J,L" }],
  // 88: R:D vs R:G
  [{ type: "R", ref: "D" }, { type: "R", ref: "G" }],
];

// Placeholder label helper
function r32Label(slot: R32Slot): string {
  if (slot.type === "W") return `1${slot.ref}`;
  if (slot.type === "R") return `2${slot.ref}`;
  // best_third
  return `3º ${slot.ref.replace(/,/g, "/")}`;
}

// Matches 89..104 fed by winners (and 103 by losers) of earlier matches
// Official feeds:
// R16: 89:[74,77] 90:[73,75] 91:[76,78] 92:[79,80] 93:[83,84] 94:[81,82] 95:[86,88] 96:[85,87]
// QF:  97:[89,90] 98:[93,94] 99:[91,92] 100:[95,96]
// SF:  101:[97,98] 102:[99,100]
// 3rd: 103:[101,102] (losers)  Final: 104:[101,102] (winners)
const FEEDS: Record<number, [number, number]> = {
  89: [74, 77], 90: [73, 75], 91: [76, 78], 92: [79, 80],
  93: [83, 84], 94: [81, 82], 95: [86, 88], 96: [85, 87],
  97: [89, 90], 98: [93, 94], 99: [91, 92], 100: [95, 96],
  101: [97, 98], 102: [99, 100], 103: [101, 102], 104: [101, 102],
};

function knockoutStage(mn: number): string {
  if (mn <= 88) return "round_of_32";
  if (mn <= 96) return "round_of_16";
  if (mn <= 100) return "quarter_final";
  if (mn <= 102) return "semi_final";
  if (mn === 103) return "third_place";
  return "final";
}

// Sample played results — group matches 1..8 are finished (so the
// Resultados screen has real content). [home_score, away_score].
const GROUP_RESULTS: Record<number, [number, number]> = {
  1: [2, 0], 2: [1, 1], 3: [3, 1], 4: [0, 2],
  5: [1, 0], 6: [2, 2], 7: [0, 1], 8: [3, 0],
};

function buildMatches(): Row[] {
  const matches: Row[] = [];
  const groups = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

  // Group stage — matches 1..72
  groups.forEach((group, g) => {
    const base = g * 4;
    GROUP_PATTERN.forEach(([h, a], i) => {
      const mn = g * 6 + i + 1;
      const day = 11 + Math.floor((mn - 1) / 6); // June 11..22
      const hour = [13, 16, 19, 22][i % 4];
      matches.push({
        id: mn,
        match_number: mn,
        stage: "group",
        group_letter: group,
        home_team_id: base + h,
        away_team_id: base + a,
        home_placeholder: null,
        away_placeholder: null,
        match_date: `2026-06-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00+00:00`,
        venue: null,
        home_score: GROUP_RESULTS[mn]?.[0] ?? null,
        away_score: GROUP_RESULTS[mn]?.[1] ?? null,
        penalty_winner_team_id: null,
        is_finished: GROUP_RESULTS[mn] !== undefined,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      });
    });
  });

  // Knockout — matches 73..104
  for (let mn = 73; mn <= 104; mn++) {
    let home_placeholder = "";
    let away_placeholder = "";
    if (mn <= 88) {
      const [hs, as_] = R32_MATCHES[mn - 73];
      home_placeholder = r32Label(hs);
      away_placeholder = r32Label(as_);
    } else {
      const [h, a] = FEEDS[mn];
      const prefix = mn === 103 ? "L" : "W";
      home_placeholder = `${prefix}${h}`;
      away_placeholder = `${prefix}${a}`;
    }
    const day = 28 + Math.floor((mn - 73) * 0.7); // spread across late June–July
    matches.push({
      id: mn,
      match_number: mn,
      stage: knockoutStage(mn),
      group_letter: null,
      home_team_id: null,
      away_team_id: null,
      home_placeholder,
      away_placeholder,
      match_date: `2026-0${day > 30 ? 7 : 6}-${String(day > 30 ? day - 30 : day).padStart(2, "0")}T19:00:00+00:00`,
      venue: null,
      home_score: null,
      away_score: null,
      penalty_winner_team_id: null,
      is_finished: false,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    });
  }

  return matches;
}

// ---------------------------------------------------------------
// KNOCKOUT BRACKET POSITIONS — how group results feed knockout
// ---------------------------------------------------------------
function slotSourceType(s: R32Slot): string {
  if (s.type === "W") return "group_winner";
  if (s.type === "R") return "group_runner_up";
  return "best_third";
}

function buildBracketPositions(): Row[] {
  const rows: Row[] = [];
  let id = 1;
  const add = (r: Row) => rows.push({ id: id++, ...r });

  R32_MATCHES.forEach(([hs, as_], i) => {
    const mn = 73 + i;
    const addSlot = (slot: "home" | "away", s: R32Slot) => {
      const source_type = slotSourceType(s);
      if (source_type === "best_third") {
        add({
          match_number: mn, slot, source_type,
          source_group: null, source_match_number: null,
          best_third_pool: s.ref,
          description: `3º mejor (${s.ref})`,
        });
      } else {
        add({
          match_number: mn, slot, source_type,
          source_group: s.ref, source_match_number: null,
          best_third_pool: null,
          description: `${s.type === "W" ? "1º" : "2º"}${s.ref}`,
        });
      }
    };
    addSlot("home", hs);
    addSlot("away", as_);
  });

  for (let mn = 89; mn <= 104; mn++) {
    const [h, a] = FEEDS[mn];
    const type = mn === 103 ? "match_loser" : "match_winner";
    const label = mn === 103 ? "Perdedor" : "Ganador";
    add({ match_number: mn, slot: "home", source_type: type, source_group: null, source_match_number: h, best_third_pool: null, description: `${label} P${h}` });
    add({ match_number: mn, slot: "away", source_type: type, source_group: null, source_match_number: a, best_third_pool: null, description: `${label} P${a}` });
  }

  return rows;
}

// ---------------------------------------------------------------
// SCORING RULES — from seed.sql
// ---------------------------------------------------------------
const SCORING_RULES: [string, string, number, string][] = [
  ["group_stage", "correct_sign", 1, "Acertar signo 1X2 en fase de grupos"],
  ["group_stage", "exact_score", 1, "Resultado exacto en fase de grupos (+1 adicional)"],
  ["group_stage", "group_pos_1st", 1, "Acertar 1º de grupo"],
  ["group_stage", "group_pos_2nd", 1, "Acertar 2º de grupo"],
  ["group_stage", "group_pos_3rd", 3, "Acertar 3º de grupo"],
  ["group_stage", "group_pos_4th", 3, "Acertar 4º de grupo"],
  ["qualification", "qualify_r32", 3, "Equipo clasificado a octavos (R32)"],
  ["qualification", "qualify_r16", 10, "Equipo clasificado a cuartos"],
  ["qualification", "qualify_qf", 15, "Equipo clasificado a semifinal"],
  ["qualification", "qualify_sf", 20, "Equipo clasificado a final"],
  ["qualification", "qualify_champion", 30, "Acertar campeón"],
  ["qualification", "qualify_third", 8, "Acertar tercer puesto"],
  ["knockout_exact", "exact_r32", 2, "Resultado exacto en octavos (R32)"],
  ["knockout_exact", "exact_r16", 4, "Resultado exacto en cuartos (R16)"],
  ["knockout_exact", "exact_qf", 6, "Resultado exacto en semifinal"],
  ["knockout_exact", "exact_third", 5, "Resultado exacto 3º/4º puesto"],
  ["knockout_exact", "exact_final", 10, "Resultado exacto en la final"],
  ["awards", "golden_boot", 10, "Acertar Bota de Oro"],
  ["awards", "golden_ball", 10, "Acertar Balón de Oro"],
  ["awards", "golden_glove", 10, "Acertar Guante de Oro"],
];

function buildScoringRules(): Row[] {
  return SCORING_RULES.map(([category, rule_key, points, description], i) => ({
    id: i + 1,
    category,
    rule_key,
    points,
    description,
    created_at: "2026-01-01T00:00:00Z",
  }));
}

// ---------------------------------------------------------------
// PLAYERS — sample squad for the awards (premios) screens
// ---------------------------------------------------------------
const PLAYER_DEFS: [string, number, string][] = [
  ["Lamine Yamal", 5, "Delantero"], ["Pedri", 5, "Centrocampista"],
  ["Unai Simón", 5, "Portero"], ["Kylian Mbappé", 9, "Delantero"],
  ["Antoine Griezmann", 9, "Delantero"], ["Mike Maignan", 9, "Portero"],
  ["Vinícius Jr.", 17, "Delantero"], ["Rodrygo", 17, "Delantero"],
  ["Alisson", 17, "Portero"], ["Lionel Messi", 25, "Delantero"],
  ["Julián Álvarez", 25, "Delantero"], ["Emiliano Martínez", 25, "Portero"],
  ["Harry Kane", 41, "Delantero"], ["Jude Bellingham", 41, "Centrocampista"],
  ["Jordan Pickford", 41, "Portero"], ["Cristiano Ronaldo", 33, "Delantero"],
];

function buildPlayers(): Row[] {
  return PLAYER_DEFS.map(([name, team_id, position], i) => ({
    id: i + 1,
    name,
    team_id,
    position,
    created_at: "2026-01-01T00:00:00Z",
  }));
}

// ---------------------------------------------------------------
// PROFILES + USER SCORES — "los noeles" + a few rivals
// ---------------------------------------------------------------
const uid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const PROFILE_DEFS: { id: string; display_name: string; email: string; has_paid: boolean; is_admin: boolean }[] = [
  { id: MOCK_USER_ID, display_name: "Noé", email: "noe@noeles.com", has_paid: true, is_admin: true },
  { id: uid(2), display_name: "Noelia", email: "noelia@noeles.com", has_paid: true, is_admin: false },
  { id: uid(3), display_name: "Noah", email: "noah@noeles.com", has_paid: true, is_admin: false },
  { id: uid(4), display_name: "Noemí", email: "noemi@noeles.com", has_paid: true, is_admin: false },
  { id: uid(5), display_name: "Manolo", email: "manolo@noeles.com", has_paid: true, is_admin: false },
  { id: uid(6), display_name: "Carmen", email: "carmen@noeles.com", has_paid: true, is_admin: false },
  { id: uid(7), display_name: "Invitado sin pagar", email: "invitado@noeles.com", has_paid: false, is_admin: false },
];

function buildProfiles(): Row[] {
  return PROFILE_DEFS.map((p) => ({
    id: p.id,
    display_name: p.display_name,
    email: p.email,
    has_paid: p.has_paid,
    is_admin: p.is_admin,
    is_chat_banned: false,
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-15T10:00:00Z",
  }));
}

const SCORE_DEFS: [string, number, number, number, number][] = [
  // [user_id, group, knockout_exact, qualification, award]
  [uid(3), 24, 12, 48, 10],
  [uid(2), 21, 8, 41, 20],
  [MOCK_USER_ID, 19, 10, 33, 10],
  [uid(5), 17, 6, 28, 0],
  [uid(6), 14, 4, 22, 10],
  [uid(4), 11, 2, 15, 0],
];

function buildUserScores(): Row[] {
  return SCORE_DEFS.map(([user_id, g, k, q, a], i) => ({
    id: uid(100 + i),
    user_id,
    group_stage_points: g,
    knockout_exact_points: k,
    qualification_points: q,
    award_points: a,
    total_points: g + k + q + a,
    updated_at: nowIso(),
  }));
}

// ---------------------------------------------------------------
// MATCH PREDICTIONS — the mock user's picks for the played matches
// (matches 1..7; match 8 left unpredicted on purpose for variety)
// ---------------------------------------------------------------
const USER_PICKS: Record<number, [number, number]> = {
  1: [2, 0], 2: [1, 1], 3: [2, 1], 4: [1, 1], 5: [1, 0], 6: [0, 0], 7: [2, 0],
};

function buildMatchPredictions(): Row[] {
  return Object.entries(USER_PICKS).map(([mn, [home, away]], i) => ({
    id: uid(300 + i),
    user_id: MOCK_USER_ID,
    match_id: Number(mn),
    home_score: home,
    away_score: away,
    penalty_winner: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  }));
}

// ---------------------------------------------------------------
// CHAT MESSAGES — a little conversation to style against
// ---------------------------------------------------------------
function buildChatMessages(): Row[] {
  const base = Date.now() - 1000 * 60 * 60;
  const defs: [string, string, number][] = [
    [uid(2), "¡Ya están abiertas las predicciones! 🎉", 0],
    [uid(3), "Yo lo tengo claro, gana España 😎", 6],
    [MOCK_USER_ID, "Eso lo dices todos los mundiales 😅", 12],
    [uid(5), "¿Alguien ha rellenado ya la fase de grupos?", 25],
    [uid(6), "A medias, el grupo de la muerte me está costando 🫠", 40],
  ];
  return defs.map(([user_id, message, minutes], i) => ({
    id: uid(200 + i),
    user_id,
    message,
    is_deleted: false,
    created_at: new Date(base + minutes * 60 * 1000).toISOString(),
  }));
}

// ---------------------------------------------------------------
// DB FACTORY
// ---------------------------------------------------------------
export function createDb(): Db {
  return {
    profiles: buildProfiles(),
    teams: buildTeams(),
    players: buildPlayers(),
    matches: buildMatches(),
    knockout_bracket_positions: buildBracketPositions(),
    match_predictions: buildMatchPredictions(),
    predicted_group_standings: [],
    award_predictions: [],
    actual_awards: [],
    scoring_rules: buildScoringRules(),
    user_scores: buildUserScores(),
    score_events: [],
    chat_messages: buildChatMessages(),
    tournament_config: [
      { id: 1, key: "predictions_locked", value: "false", updated_at: nowIso() },
      { id: 2, key: "lock_datetime", value: "2026-06-11T15:00:00Z", updated_at: nowIso() },
      { id: 3, key: "bizum_phone", value: "+34627151087", updated_at: nowIso() },
      { id: 4, key: "bizum_amount", value: "10", updated_at: nowIso() },
      { id: 5, key: "tournament_name", value: "Porra del Mundial 2026", updated_at: nowIso() },
    ],
  };
}

export const UUID_TABLES = new Set([
  "match_predictions",
  "predicted_group_standings",
  "award_predictions",
  "user_scores",
  "score_events",
  "chat_messages",
]);
