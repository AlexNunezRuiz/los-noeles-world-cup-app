import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/007_player_nationality.sql", "utf8");
const seed = readFileSync("supabase/players_seed.sql", "utf8");

if (!/ALTER TABLE players ADD COLUMN IF NOT EXISTS nationality TEXT/.test(migration)) {
  throw new Error("Missing players.nationality migration");
}

if (!/INSERT INTO players \(name, team_id, position, shirt_number, nationality, squad_source\) VALUES/.test(seed)) {
  throw new Error("Players seed must include number and nationality columns");
}

const rows = [...seed.matchAll(/\('(?:[^']|'')+',\s*(\d+),\s*'(?:[^']|'')+',\s*(\d+|NULL),\s*'(?:[^']|'')+',\s*'(?:[^']|'')+'\)/g)];

if (rows.length < 1104 || rows.length > 1248) {
  throw new Error(`Expected between 1104 and 1248 official player rows, found ${rows.length}`);
}

const counts = new Map();
for (const [, teamId] of rows) {
  counts.set(teamId, (counts.get(teamId) ?? 0) + 1);
}

const badCounts = [...counts.entries()].filter(([, count]) => count < 23 || count > 26);
if (counts.size !== 48 || badCounts.length > 0) {
  throw new Error(`Expected 23-26 players for each of 48 teams, got ${JSON.stringify(Object.fromEntries(counts))}`);
}

console.log("players seed ok");
