// Etiquetas dos estados do protocolo, em português clínico.
// Rascunho → Em Preparação (dia da preparação / cirurgia virtual concluída)
// → Intra-op Registado → Finalizado.
export const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  preop_complete: "Em Preparação",
  intraop_complete: "Intra-op Registado",
  finalized: "Finalizado",
};

export function statusLabel(status?: string | null): string {
  return (status && STATUS_LABELS[status]) || status || "";
}
