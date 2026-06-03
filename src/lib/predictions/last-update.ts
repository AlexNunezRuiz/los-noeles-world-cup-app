export function formatLastPredictionUpdate(value: string | null | undefined) {
  if (!value) return "Sin guardar";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin guardar";

  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
