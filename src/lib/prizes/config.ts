export type PrizeRecipient =
  | "ranking_1"
  | "ranking_2"
  | "ranking_3"
  | "group_champion"
  | "last_place"
  | "custom";

export type PrizeType = "percentage" | "fixed";

export interface PrizeConfig {
  key: string;
  label: string;
  recipient: PrizeRecipient;
  type: PrizeType;
  value: number;
  active: boolean;
}

export interface PrizeBreakdownItem extends PrizeConfig {
  amount: number;
  detail: string;
}

export interface PrizeBreakdown {
  total: number;
  distributable: number;
  fixedTotal: number;
  items: PrizeBreakdownItem[];
}

export const DEFAULT_ENTRY_FEE = 5;

export const DEFAULT_PRIZE_DISTRIBUTION: PrizeConfig[] = [
  { key: "first", label: "1o Clasificado", recipient: "ranking_1", type: "percentage", value: 60, active: true },
  { key: "second", label: "2o Clasificado", recipient: "ranking_2", type: "percentage", value: 25, active: true },
  { key: "third", label: "3o Clasificado", recipient: "ranking_3", type: "percentage", value: 10, active: true },
  { key: "group_champion", label: "Campeon de grupos", recipient: "group_champion", type: "percentage", value: 5, active: true },
  { key: "last_place", label: "Farolillo rojo", recipient: "last_place", type: "fixed", value: DEFAULT_ENTRY_FEE, active: true },
];

export const PRIZE_RECIPIENT_LABELS: Record<PrizeRecipient, string> = {
  ranking_1: "1o clasificado general",
  ranking_2: "2o clasificado general",
  ranking_3: "3o clasificado general",
  group_champion: "Campeon de fase de grupos",
  last_place: "Ultimo clasificado",
  custom: "Personalizado",
};

export function parsePaymentAmount(value?: string | null) {
  const amount = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(amount) && amount > 0 ? amount : DEFAULT_ENTRY_FEE;
}

export function formatEuros(amount: number) {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2).replace(".", ",");
}

function normalizePrize(raw: Partial<PrizeConfig>, index: number, entryFee: number): PrizeConfig | null {
  const fallback = DEFAULT_PRIZE_DISTRIBUTION[index];
  const key = String(raw.key || fallback?.key || `prize_${index + 1}`);
  const label = String(raw.label || fallback?.label || `Premio ${index + 1}`).trim();
  const recipient = isPrizeRecipient(raw.recipient) ? raw.recipient : fallback?.recipient ?? "custom";
  const type = raw.type === "fixed" ? "fixed" : "percentage";
  const parsedValue = Number(raw.value);
  const value = Number.isFinite(parsedValue) && parsedValue >= 0
    ? parsedValue
    : type === "fixed"
      ? entryFee
      : 0;

  if (!label) return null;

  return {
    key,
    label,
    recipient,
    type,
    value,
    active: raw.active !== false,
  };
}

function isPrizeRecipient(value: unknown): value is PrizeRecipient {
  return typeof value === "string" && value in PRIZE_RECIPIENT_LABELS;
}

export function defaultPrizeDistribution(entryFee = DEFAULT_ENTRY_FEE): PrizeConfig[] {
  return DEFAULT_PRIZE_DISTRIBUTION.map((item) => ({
    ...item,
    value: item.type === "fixed" && item.key === "last_place" ? entryFee : item.value,
  }));
}

export function parsePrizeDistribution(value?: string | null, entryFee = DEFAULT_ENTRY_FEE): PrizeConfig[] {
  if (!value) return defaultPrizeDistribution(entryFee);

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return defaultPrizeDistribution(entryFee);

    const normalized = parsed
      .map((item, index) => normalizePrize(item, index, entryFee))
      .filter((item): item is PrizeConfig => Boolean(item))
      .filter((item) => item.active);

    return normalized.length > 0 ? normalized : defaultPrizeDistribution(entryFee);
  } catch {
    return defaultPrizeDistribution(entryFee);
  }
}

export function parseEditablePrizeDistribution(value?: string | null, entryFee = DEFAULT_ENTRY_FEE): PrizeConfig[] {
  if (!value) return defaultPrizeDistribution(entryFee);

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return defaultPrizeDistribution(entryFee);
    const normalized = parsed
      .map((item, index) => normalizePrize(item, index, entryFee))
      .filter((item): item is PrizeConfig => Boolean(item));
    return normalized.length > 0 ? normalized : defaultPrizeDistribution(entryFee);
  } catch {
    return defaultPrizeDistribution(entryFee);
  }
}

export function serializePrizeDistribution(distribution: PrizeConfig[]) {
  return JSON.stringify(distribution);
}

export function prizeDistributionPercentTotal(distribution: PrizeConfig[]) {
  return distribution
    .filter((item) => item.active && item.type === "percentage")
    .reduce((sum, item) => sum + item.value, 0);
}

export function calculatePrizeBreakdown({
  paidCount,
  entryFee,
  distribution,
}: {
  paidCount: number;
  entryFee: number;
  distribution: PrizeConfig[];
}): PrizeBreakdown {
  const total = Math.max(0, paidCount) * entryFee;
  const active = distribution.filter((item) => item.active);
  const fixedTotal = active
    .filter((item) => item.type === "fixed")
    .reduce((sum, item) => sum + item.value, 0);
  const distributable = Math.max(0, total - fixedTotal);

  return {
    total,
    fixedTotal,
    distributable,
    items: active.map((item) => {
      const amount = item.type === "fixed"
        ? Math.min(item.value, total)
        : Math.floor(distributable * (item.value / 100));

      return {
        ...item,
        amount,
        detail: item.type === "fixed" ? `${formatEuros(item.value)} fijo` : `${item.value}% del bote restante`,
      };
    }),
  };
}
