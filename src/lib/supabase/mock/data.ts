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
  // Group A (ids 1-4)
  ["México", "MEX", "🇲🇽", "A"], ["Sudáfrica", "RSA", "🇿🇦", "A"],
  ["Corea del Sur", "KOR", "🇰🇷", "A"], ["Chequia", "CZE", "🇨🇿", "A"],
  // Group B (ids 5-8)
  ["Canadá", "CAN", "🇨🇦", "B"], ["Bosnia y Herzegovina", "BIH", "🇧🇦", "B"],
  ["Catar", "QAT", "🇶🇦", "B"], ["Suiza", "SUI", "🇨🇭", "B"],
  // Group C (ids 9-12)
  ["Brasil", "BRA", "🇧🇷", "C"], ["Marruecos", "MAR", "🇲🇦", "C"],
  ["Haití", "HAI", "🇭🇹", "C"], ["Escocia", "SCO", "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "C"],
  // Group D (ids 13-16)
  ["Estados Unidos", "USA", "🇺🇸", "D"], ["Paraguay", "PAR", "🇵🇾", "D"],
  ["Australia", "AUS", "🇦🇺", "D"], ["Turquía", "TUR", "🇹🇷", "D"],
  // Group E (ids 17-20)
  ["Alemania", "GER", "🇩🇪", "E"], ["Curazao", "CUW", "🇨🇼", "E"],
  ["Costa de Marfil", "CIV", "🇨🇮", "E"], ["Ecuador", "ECU", "🇪🇨", "E"],
  // Group F (ids 21-24)
  ["Países Bajos", "NED", "🇳🇱", "F"], ["Japón", "JPN", "🇯🇵", "F"],
  ["Suecia", "SWE", "🇸🇪", "F"], ["Túnez", "TUN", "🇹🇳", "F"],
  // Group G (ids 25-28)
  ["Bélgica", "BEL", "🇧🇪", "G"], ["Egipto", "EGY", "🇪🇬", "G"],
  ["Irán", "IRN", "🇮🇷", "G"], ["Nueva Zelanda", "NZL", "🇳🇿", "G"],
  // Group H (ids 29-32)
  ["España", "ESP", "🇪🇸", "H"], ["Cabo Verde", "CPV", "🇨🇻", "H"],
  ["Arabia Saudita", "KSA", "🇸🇦", "H"], ["Uruguay", "URU", "🇺🇾", "H"],
  // Group I (ids 33-36)
  ["Francia", "FRA", "🇫🇷", "I"], ["Senegal", "SEN", "🇸🇳", "I"],
  ["Irak", "IRQ", "🇮🇶", "I"], ["Noruega", "NOR", "🇳🇴", "I"],
  // Group J (ids 37-40)
  ["Argentina", "ARG", "🇦🇷", "J"], ["Argelia", "ALG", "🇩🇿", "J"],
  ["Austria", "AUT", "🇦🇹", "J"], ["Jordania", "JOR", "🇯🇴", "J"],
  // Group K (ids 41-44)
  ["Portugal", "POR", "🇵🇹", "K"], ["R.D. del Congo", "COD", "🇨🇩", "K"],
  ["Uzbekistán", "UZB", "🇺🇿", "K"], ["Colombia", "COL", "🇨🇴", "K"],
  // Group L (ids 45-48)
  ["Inglaterra", "ENG", "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "L"], ["Croacia", "CRO", "🇭🇷", "L"],
  ["Ghana", "GHA", "🇬🇭", "L"], ["Panamá", "PAN", "🇵🇦", "L"],
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

// ---------------------------------------------------------------
// VENUES (16) — from migration 002 + seed.sql
// ---------------------------------------------------------------
const VENUE_DEFS: [string, string, string][] = [
  ["Mercedes-Benz Stadium", "Atlanta", "Estados Unidos"],
  ["Gillette Stadium", "Foxborough", "Estados Unidos"],
  ["AT&T Stadium", "Arlington", "Estados Unidos"],
  ["Estadio Akron", "Zapopan", "México"],
  ["NRG Stadium", "Houston", "Estados Unidos"],
  ["Arrowhead Stadium", "Kansas City", "Estados Unidos"],
  ["SoFi Stadium", "Inglewood", "Estados Unidos"],
  ["Estadio Azteca", "Ciudad de México", "México"],
  ["Hard Rock Stadium", "Miami Gardens", "Estados Unidos"],
  ["Estadio BBVA", "Guadalupe", "México"],
  ["MetLife Stadium", "East Rutherford", "Estados Unidos"],
  ["Lincoln Financial Field", "Filadelfia", "Estados Unidos"],
  ["Levi's Stadium", "Santa Clara", "Estados Unidos"],
  ["Lumen Field", "Seattle", "Estados Unidos"],
  ["BMO Field", "Toronto", "Canadá"],
  ["BC Place", "Vancouver", "Canadá"],
];

const VENUES: Row[] = VENUE_DEFS.map(([name, city, country], i) => ({
  id: i + 1,
  name,
  city,
  country,
  created_at: "2026-01-01T00:00:00Z",
}));

// ---------------------------------------------------------------
// SCHEDULE — match_number -> { date (UTC ISO), venue (1-16) }
// Calendario oficial; generado por scripts/build-schedule.mjs.
// ---------------------------------------------------------------
const SCHEDULE: Record<number, { date: string; venue: number }> = {
  1: { date: "2026-06-11T19:00:00Z", venue: 8 },
  2: { date: "2026-06-12T02:00:00Z", venue: 4 },
  3: { date: "2026-06-19T01:00:00Z", venue: 4 },
  4: { date: "2026-06-18T16:00:00Z", venue: 1 },
  5: { date: "2026-06-25T01:00:00Z", venue: 8 },
  6: { date: "2026-06-25T01:00:00Z", venue: 10 },
  7: { date: "2026-06-12T19:00:00Z", venue: 15 },
  8: { date: "2026-06-13T19:00:00Z", venue: 13 },
  9: { date: "2026-06-18T22:00:00Z", venue: 16 },
  10: { date: "2026-06-18T19:00:00Z", venue: 7 },
  11: { date: "2026-06-24T19:00:00Z", venue: 16 },
  12: { date: "2026-06-24T19:00:00Z", venue: 14 },
  13: { date: "2026-06-13T22:00:00Z", venue: 11 },
  14: { date: "2026-06-14T01:00:00Z", venue: 2 },
  15: { date: "2026-06-20T00:30:00Z", venue: 12 },
  16: { date: "2026-06-19T22:00:00Z", venue: 2 },
  17: { date: "2026-06-24T22:00:00Z", venue: 9 },
  18: { date: "2026-06-24T22:00:00Z", venue: 1 },
  19: { date: "2026-06-13T01:00:00Z", venue: 7 },
  20: { date: "2026-06-14T04:00:00Z", venue: 16 },
  21: { date: "2026-06-19T19:00:00Z", venue: 14 },
  22: { date: "2026-06-20T03:00:00Z", venue: 13 },
  23: { date: "2026-06-26T02:00:00Z", venue: 7 },
  24: { date: "2026-06-26T02:00:00Z", venue: 13 },
  25: { date: "2026-06-14T17:00:00Z", venue: 5 },
  26: { date: "2026-06-14T23:00:00Z", venue: 12 },
  27: { date: "2026-06-20T20:00:00Z", venue: 15 },
  28: { date: "2026-06-21T00:00:00Z", venue: 6 },
  29: { date: "2026-06-25T20:00:00Z", venue: 11 },
  30: { date: "2026-06-25T20:00:00Z", venue: 12 },
  31: { date: "2026-06-14T20:00:00Z", venue: 3 },
  32: { date: "2026-06-15T02:00:00Z", venue: 10 },
  33: { date: "2026-06-20T17:00:00Z", venue: 5 },
  34: { date: "2026-06-21T04:00:00Z", venue: 10 },
  35: { date: "2026-06-25T23:00:00Z", venue: 6 },
  36: { date: "2026-06-25T23:00:00Z", venue: 3 },
  37: { date: "2026-06-15T19:00:00Z", venue: 14 },
  38: { date: "2026-06-16T01:00:00Z", venue: 7 },
  39: { date: "2026-06-21T19:00:00Z", venue: 7 },
  40: { date: "2026-06-22T01:00:00Z", venue: 16 },
  41: { date: "2026-06-27T03:00:00Z", venue: 16 },
  42: { date: "2026-06-27T03:00:00Z", venue: 14 },
  43: { date: "2026-06-15T16:00:00Z", venue: 1 },
  44: { date: "2026-06-15T22:00:00Z", venue: 9 },
  45: { date: "2026-06-21T16:00:00Z", venue: 1 },
  46: { date: "2026-06-21T22:00:00Z", venue: 9 },
  47: { date: "2026-06-27T00:00:00Z", venue: 4 },
  48: { date: "2026-06-27T00:00:00Z", venue: 5 },
  49: { date: "2026-06-16T19:00:00Z", venue: 11 },
  50: { date: "2026-06-16T22:00:00Z", venue: 2 },
  51: { date: "2026-06-22T21:00:00Z", venue: 12 },
  52: { date: "2026-06-23T00:00:00Z", venue: 11 },
  53: { date: "2026-06-26T19:00:00Z", venue: 2 },
  54: { date: "2026-06-26T19:00:00Z", venue: 15 },
  55: { date: "2026-06-17T01:00:00Z", venue: 6 },
  56: { date: "2026-06-17T04:00:00Z", venue: 13 },
  57: { date: "2026-06-22T17:00:00Z", venue: 3 },
  58: { date: "2026-06-23T03:00:00Z", venue: 13 },
  59: { date: "2026-06-28T02:00:00Z", venue: 3 },
  60: { date: "2026-06-28T02:00:00Z", venue: 6 },
  61: { date: "2026-06-17T17:00:00Z", venue: 5 },
  62: { date: "2026-06-18T02:00:00Z", venue: 8 },
  63: { date: "2026-06-23T17:00:00Z", venue: 5 },
  64: { date: "2026-06-24T02:00:00Z", venue: 4 },
  65: { date: "2026-06-27T23:30:00Z", venue: 9 },
  66: { date: "2026-06-27T23:30:00Z", venue: 1 },
  67: { date: "2026-06-17T20:00:00Z", venue: 3 },
  68: { date: "2026-06-17T23:00:00Z", venue: 15 },
  69: { date: "2026-06-23T20:00:00Z", venue: 2 },
  70: { date: "2026-06-23T23:00:00Z", venue: 15 },
  71: { date: "2026-06-27T21:00:00Z", venue: 11 },
  72: { date: "2026-06-27T21:00:00Z", venue: 12 },
  73: { date: "2026-06-28T19:00:00Z", venue: 7 },
  74: { date: "2026-06-29T20:30:00Z", venue: 2 },
  75: { date: "2026-06-30T01:00:00Z", venue: 10 },
  76: { date: "2026-06-29T17:00:00Z", venue: 5 },
  77: { date: "2026-06-30T21:00:00Z", venue: 11 },
  78: { date: "2026-06-30T17:00:00Z", venue: 3 },
  79: { date: "2026-07-01T01:00:00Z", venue: 8 },
  80: { date: "2026-07-01T16:00:00Z", venue: 1 },
  81: { date: "2026-07-02T00:00:00Z", venue: 13 },
  82: { date: "2026-07-01T20:00:00Z", venue: 14 },
  83: { date: "2026-07-02T23:00:00Z", venue: 15 },
  84: { date: "2026-07-02T19:00:00Z", venue: 7 },
  85: { date: "2026-07-03T03:00:00Z", venue: 16 },
  86: { date: "2026-07-03T22:00:00Z", venue: 9 },
  87: { date: "2026-07-04T01:30:00Z", venue: 6 },
  88: { date: "2026-07-03T18:00:00Z", venue: 3 },
  89: { date: "2026-07-04T21:00:00Z", venue: 12 },
  90: { date: "2026-07-04T17:00:00Z", venue: 5 },
  91: { date: "2026-07-05T20:00:00Z", venue: 11 },
  92: { date: "2026-07-06T00:00:00Z", venue: 8 },
  93: { date: "2026-07-06T19:00:00Z", venue: 3 },
  94: { date: "2026-07-07T00:00:00Z", venue: 14 },
  95: { date: "2026-07-07T16:00:00Z", venue: 1 },
  96: { date: "2026-07-07T20:00:00Z", venue: 16 },
  97: { date: "2026-07-09T20:00:00Z", venue: 2 },
  98: { date: "2026-07-10T19:00:00Z", venue: 7 },
  99: { date: "2026-07-11T21:00:00Z", venue: 9 },
  100: { date: "2026-07-12T01:00:00Z", venue: 6 },
  101: { date: "2026-07-14T19:00:00Z", venue: 3 },
  102: { date: "2026-07-15T19:00:00Z", venue: 1 },
  103: { date: "2026-07-18T21:00:00Z", venue: 9 },
  104: { date: "2026-07-19T19:00:00Z", venue: 11 },
};

function buildMatches(): Row[] {
  const matches: Row[] = [];
  const groups = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

  // Group stage — matches 1..72
  groups.forEach((group, g) => {
    const base = g * 4;
    GROUP_PATTERN.forEach(([h, a], i) => {
      const mn = g * 6 + i + 1;
      matches.push({
        id: mn,
        match_number: mn,
        stage: "group",
        group_letter: group,
        home_team_id: base + h,
        away_team_id: base + a,
        home_placeholder: null,
        away_placeholder: null,
        match_date: SCHEDULE[mn].date,
        venue_id: SCHEDULE[mn].venue,
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
    matches.push({
      id: mn,
      match_number: mn,
      stage: knockoutStage(mn),
      group_letter: null,
      home_team_id: null,
      away_team_id: null,
      home_placeholder,
      away_placeholder,
      match_date: SCHEDULE[mn].date,
      venue_id: SCHEDULE[mn].venue,
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
  // España (id 29)
  ["Lamine Yamal", 29, "Delantero"], ["Pedri", 29, "Centrocampista"],
  ["Unai Simón", 29, "Portero"],
  // Francia (id 33)
  ["Kylian Mbappé", 33, "Delantero"], ["Antoine Griezmann", 33, "Delantero"],
  ["Mike Maignan", 33, "Portero"],
  // Brasil (id 9)
  ["Vinícius Jr.", 9, "Delantero"], ["Rodrygo", 9, "Delantero"],
  ["Alisson", 9, "Portero"],
  // Argentina (id 37)
  ["Lionel Messi", 37, "Delantero"], ["Julián Álvarez", 37, "Delantero"],
  ["Emiliano Martínez", 37, "Portero"],
  // Inglaterra (id 45)
  ["Harry Kane", 45, "Delantero"], ["Jude Bellingham", 45, "Centrocampista"],
  ["Jordan Pickford", 45, "Portero"],
  // Portugal (id 41)
  ["Cristiano Ronaldo", 41, "Delantero"],
];

function buildPlayers(): Row[] {
  return PLAYER_DEFS.map(([name, team_id, position], i) => ({
    id: i + 1,
    name,
    team_id,
    position,
    shirt_number: null,
    squad_source: "mock",
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
    username: p.email.split("@")[0],
    has_paid: p.has_paid,
    paid_at: p.has_paid ? "2026-01-15T10:00:00Z" : null,
    payment_validated_by: p.has_paid ? MOCK_USER_ID : null,
    payment_note: null,
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
    venues: VENUES,
    players: buildPlayers(),
    matches: buildMatches(),
    knockout_bracket_positions: buildBracketPositions(),
    match_predictions: buildMatchPredictions(),
    predicted_group_standings: [],
    predicted_best_third_order: [],
    award_predictions: [],
    actual_awards: [],
    scoring_rules: buildScoringRules(),
    user_scores: buildUserScores(),
    score_events: [],
    chat_messages: buildChatMessages(),
    chat_message_mentions: [],
    chat_message_reactions: [],
    notifications: [],
    tournament_config: [
      { id: 1, key: "predictions_locked", value: "false", updated_at: nowIso() },
      { id: 2, key: "lock_datetime", value: "2026-06-11T15:00:00Z", updated_at: nowIso() },
      { id: 3, key: "bizum_phone", value: "+34627151087", updated_at: nowIso() },
      { id: 4, key: "bizum_amount", value: "10", updated_at: nowIso() },
      { id: 5, key: "tournament_name", value: "Porra del Mundial 2026", updated_at: nowIso() },
      { id: 6, key: "payment_amount", value: "5", updated_at: nowIso() },
      { id: 7, key: "payment_method", value: "transfer", updated_at: nowIso() },
      { id: 8, key: "bank_account_holder", value: "", updated_at: nowIso() },
      { id: 9, key: "bank_iban", value: "", updated_at: nowIso() },
      { id: 10, key: "bank_concept_prefix", value: "PORRA", updated_at: nowIso() },
      {
        id: 11,
        key: "prize_distribution",
        value:
          '[{"key":"first","label":"1o Clasificado","recipient":"ranking_1","type":"percentage","value":60,"active":true},{"key":"second","label":"2o Clasificado","recipient":"ranking_2","type":"percentage","value":25,"active":true},{"key":"third","label":"3o Clasificado","recipient":"ranking_3","type":"percentage","value":10,"active":true},{"key":"group_champion","label":"Campeon de grupos","recipient":"group_champion","type":"percentage","value":5,"active":true},{"key":"last_place","label":"Farolillo rojo","recipient":"last_place","type":"fixed","value":5,"active":true}]',
        updated_at: nowIso(),
      },
    ],
  };
}

export const UUID_TABLES = new Set([
  "match_predictions",
  "predicted_group_standings",
  "predicted_best_third_order",
  "award_predictions",
  "user_scores",
  "score_events",
  "chat_messages",
  "chat_message_mentions",
  "chat_message_reactions",
  "notifications",
]);
