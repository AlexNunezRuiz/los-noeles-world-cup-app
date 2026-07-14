interface ScoreEvent {
  user_id: string;
  match_id: number | null;
  rule_key: string;
  points: number;
  description: string;
}

export interface MatchPredictionRow {
  user_id: string;
  match_id: number;
  home_score: number;
  away_score: number;
}

export interface PredictedStandingRow {
  user_id: string;
  group_letter: string;
  team_id: number;
  position: number;
}

// Puras: reciben las predicciones ya cargadas (el recálculo trae las tablas
// completas una sola vez) en lugar de consultar Supabase partido a partido.

export function scoreGroupStageMatch(
  match: { id: number; home_team_id: number; away_team_id: number; home_score: number; away_score: number; group_letter: string },
  predictions: MatchPredictionRow[],
  rules: Map<string, number>
): ScoreEvent[] {
  const events: ScoreEvent[] = [];

  for (const pred of predictions) {
    // Determine actual result sign (1=home win, X=draw, 2=away win)
    const actualSign = match.home_score > match.away_score ? "1" : match.home_score < match.away_score ? "2" : "X";
    const predSign = pred.home_score > pred.away_score ? "1" : pred.home_score < pred.away_score ? "2" : "X";

    // Correct sign (1X2)
    if (actualSign === predSign) {
      const pts = rules.get("correct_sign") || 1;
      events.push({
        user_id: pred.user_id,
        match_id: match.id,
        rule_key: "correct_sign",
        points: pts,
        description: `Acertó signo ${actualSign} en P${match.id}`,
      });

      // Exact score (bonus on top of sign)
      if (pred.home_score === match.home_score && pred.away_score === match.away_score) {
        const exactPts = rules.get("exact_score") || 1;
        events.push({
          user_id: pred.user_id,
          match_id: match.id,
          rule_key: "exact_score",
          points: exactPts,
          description: `Resultado exacto ${match.home_score}-${match.away_score} en P${match.id}`,
        });
      }
    }
  }

  return events;
}

export function scoreGroupPositions(
  groupLetter: string,
  actualPositions: Array<{ team_id: number; position: number }>,
  rules: Map<string, number>,
  predictedStandings: PredictedStandingRow[]
): ScoreEvent[] {
  const events: ScoreEvent[] = [];

  // Group by user
  const byUser = new Map<string, PredictedStandingRow[]>();
  for (const p of predictedStandings) {
    const list = byUser.get(p.user_id) || [];
    list.push(p);
    byUser.set(p.user_id, list);
  }

  for (const [userId, userPreds] of Array.from(byUser.entries())) {
    for (const actual of actualPositions) {
      const predicted = userPreds.find((up) => up.team_id === actual.team_id);
      if (!predicted || predicted.position !== actual.position) continue;

      let ruleKey: string;
      switch (actual.position) {
        case 1: ruleKey = "group_pos_1st"; break;
        case 2: ruleKey = "group_pos_2nd"; break;
        case 3: ruleKey = "group_pos_3rd"; break;
        case 4: ruleKey = "group_pos_4th"; break;
        default: continue;
      }

      const pts = rules.get(ruleKey) || 0;
      if (pts > 0) {
        events.push({
          user_id: userId,
          match_id: null,
          rule_key: ruleKey,
          points: pts,
          description: `Acertó ${actual.position}º de grupo ${groupLetter}`,
        });
      }
    }
  }

  return events;
}
