// Pure reconstruction of WHERE a user's points come from, used by the profile
// audit view. Mirrors the scoring rules in src/lib/scoring so the detail shown
// to users matches score_events exactly.

const sign = (h: number, a: number) => (h > a ? "1" : h < a ? "2" : "X");

export interface AuditMatch {
  match_id: number;
  match_number: number;
  stage: string;
  group_letter: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_score: number | null;
  away_score: number | null;
  is_finished: boolean;
}

export interface AuditPrediction {
  match_id: number;
  home_score: number;
  away_score: number;
}

export interface MatchAuditRow {
  matchId: number;
  matchNumber: number;
  groupLetter: string | null;
  homeTeamId: number | null;
  awayTeamId: number | null;
  realHome: number;
  realAway: number;
  predHome: number;
  predAway: number;
  signOk: boolean;
  exactOk: boolean;
  points: number;
}

// Signo + resultado exacto for every finished group match the user predicted.
export function auditGroupMatches(
  matches: AuditMatch[],
  predByMatchId: Map<number, AuditPrediction>,
  signPts: number,
  exactPts: number
): { rows: MatchAuditRow[]; signTotal: number; exactTotal: number } {
  const rows: MatchAuditRow[] = [];
  let signTotal = 0;
  let exactTotal = 0;

  for (const m of matches) {
    if (m.stage !== "group" || !m.is_finished || m.home_score == null || m.away_score == null) continue;
    const p = predByMatchId.get(m.match_id);
    if (!p) continue;

    const signOk = sign(p.home_score, p.away_score) === sign(m.home_score, m.away_score);
    const exactOk = signOk && p.home_score === m.home_score && p.away_score === m.away_score;
    const points = (signOk ? signPts : 0) + (exactOk ? exactPts : 0);
    signTotal += signOk ? signPts : 0;
    exactTotal += exactOk ? exactPts : 0;

    rows.push({
      matchId: m.match_id,
      matchNumber: m.match_number,
      groupLetter: m.group_letter,
      homeTeamId: m.home_team_id,
      awayTeamId: m.away_team_id,
      realHome: m.home_score,
      realAway: m.away_score,
      predHome: p.home_score,
      predAway: p.away_score,
      signOk,
      exactOk,
      points,
    });
  }

  rows.sort((a, b) => a.matchNumber - b.matchNumber);
  return { rows, signTotal, exactTotal };
}

export interface OrderAuditRow {
  teamId: number;
  predictedPosition: number | null;
  actualPosition: number;
  ok: boolean;
  points: number;
}

export interface GroupOrderAudit {
  groupLetter: string;
  rows: OrderAuditRow[];
  points: number;
}

// Compares the user's predicted positions against the real ones, per group.
export function auditGroupOrder(
  actualPositionsByGroup: Map<string, Array<{ team_id: number; position: number }>>,
  predictedPositionByGroup: Map<string, Map<number, number>>,
  posPoints: Record<number, number>
): { groups: GroupOrderAudit[]; total: number } {
  const groups: GroupOrderAudit[] = [];
  let total = 0;

  const sortedGroups = Array.from(actualPositionsByGroup.entries()).sort(([a], [b]) =>
    a.localeCompare(b, "es")
  );

  for (const [groupLetter, actual] of sortedGroups) {
    const predicted = predictedPositionByGroup.get(groupLetter);
    if (!predicted) continue;

    let points = 0;
    const rows: OrderAuditRow[] = actual
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((entry) => {
        const predictedPosition = predicted.get(entry.team_id) ?? null;
        const ok = predictedPosition === entry.position;
        const pts = ok ? posPoints[entry.position] ?? 0 : 0;
        points += pts;
        return { teamId: entry.team_id, predictedPosition, actualPosition: entry.position, ok, points: pts };
      });

    total += points;
    groups.push({ groupLetter, rows, points });
  }

  return { groups, total };
}

export interface QualifiedAuditRow {
  teamId: number;
  qualified: boolean;
}

// Which of the user's predicted round-of-32 teams actually qualified.
export function auditQualified(
  predictedR32TeamIds: number[],
  actualQualifiedTeamIds: Set<number>,
  pointsPerHit: number
): { rows: QualifiedAuditRow[]; hits: number; total: number } {
  const seen = new Set<number>();
  const rows: QualifiedAuditRow[] = [];
  for (const id of predictedR32TeamIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    rows.push({ teamId: id, qualified: actualQualifiedTeamIds.has(id) });
  }
  const hits = rows.filter((r) => r.qualified).length;
  return { rows, hits, total: hits * pointsPerHit };
}
