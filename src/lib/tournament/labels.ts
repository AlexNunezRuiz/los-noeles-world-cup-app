// Etiquetas legibles de las fases del torneo.

export function stageLabel(
  stage: string,
  groupLetter?: string | null
): string {
  switch (stage) {
    case "group":
      return groupLetter ? `Grupo ${groupLetter}` : "Fase de grupos";
    case "round_of_32":
      return "Dieciseisavos";
    case "round_of_16":
      return "Octavos";
    case "quarter_final":
      return "Cuartos";
    case "semi_final":
      return "Semifinales";
    case "third_place":
      return "3.er puesto";
    case "final":
      return "Final";
    default:
      return stage;
  }
}

/** true si la fase es de eliminación directa. */
export function isKnockout(stage: string): boolean {
  return stage !== "group";
}
