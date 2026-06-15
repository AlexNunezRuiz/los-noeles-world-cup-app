export interface RankingSearchTarget {
  id: string;
  displayName: string;
  hasPaid: boolean;
  position: number | null;
  totalPoints: number;
  isCurrentUser: boolean;
}

export interface RankingSearchSuggestion {
  id: string;
  value: string;
  label: string;
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getStatusTokens(target: RankingSearchTarget) {
  const paymentTokens = target.hasPaid
    ? ["pagado", "registrado"]
    : ["pendiente", "pago", "pagar"];
  const scoreTokens = target.totalPoints === 0 ? ["sin", "puntos"] : ["pts", "puntos"];
  const currentUserTokens = target.isCurrentUser ? ["tu", "yo", "mi"] : [];
  return [...paymentTokens, ...scoreTokens, ...currentUserTokens];
}

function matchesRankingSearchTerm(target: RankingSearchTarget, term: string) {
  const name = normalizeSearchText(target.displayName);
  if (name.includes(term)) return true;

  if (term.startsWith("#")) {
    return target.position !== null && `#${target.position}`.startsWith(term);
  }

  if (/^\d+$/.test(term)) {
    return (
      (target.position !== null && String(target.position).startsWith(term)) ||
      String(target.totalPoints).startsWith(term)
    );
  }

  return getStatusTokens(target).some((token) => token.startsWith(term));
}

export function filterRankingSearchTargets<T extends RankingSearchTarget>(
  targets: T[],
  query: string
) {
  const terms = normalizeSearchText(query).trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return targets;

  return targets.filter((target) => {
    return terms.every((term) => matchesRankingSearchTerm(target, term));
  });
}

export function getRankingSearchSuggestions(
  targets: RankingSearchTarget[],
  query: string,
  limit = 6
): RankingSearchSuggestion[] {
  if (!query.trim()) return [];

  return filterRankingSearchTargets(targets, query)
    .slice(0, limit)
    .map((target) => ({
      id: target.id,
      value: target.displayName,
      label: target.position
        ? `${target.displayName} - #${target.position} - ${target.totalPoints} pts`
        : `${target.displayName} - ${
            target.hasPaid ? "Registrado sin puntos" : "Pendiente pago"
          }`,
    }));
}
