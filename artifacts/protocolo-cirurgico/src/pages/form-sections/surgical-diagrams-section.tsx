import { useState } from "react";
import { SurgicalDiagrams, DiagramAnnotation } from "@workspace/api-client-react";
import { SurgicalDiagram } from "@/components/surgical-diagram";
import { DIAGRAMS, DiagramId } from "@/components/surgical-diagrams/diagrams";

interface Props {
  value: SurgicalDiagrams;
  onChange: (next: SurgicalDiagrams) => void;
  isFinalized?: boolean;
}

export function SurgicalDiagramsSection({ value, onChange, isFinalized = false }: Props) {
  const [active, setActive] = useState<DiagramId>("frontal");

  const updateDiagram = (id: DiagramId, next: DiagramAnnotation) =>
    onChange({ ...value, [id]: next });

  const marked = (id: DiagramId) => {
    const a = value[id];
    return a?.strokes?.length ?? 0;
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Assinale as osteotomias e placas nos esquemas da clínica com a caneta. Escolha a cor e a espessura, e use
        Apagar/Desfazer/Limpar conforme necessário. As marcações ficam guardadas no processo e saem no relatório PDF.
      </p>

      {/* Diagram selector */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {DIAGRAMS.map((d) => {
          const count = marked(d.id);
          const isActive = active === d.id;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => setActive(d.id)}
              className={`text-[11px] px-3 py-1.5 rounded-sm border uppercase tracking-wider transition-colors ${
                isActive ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:border-primary/40"
              }`}
            >
              {d.title.replace("Crânio — ", "").replace(" / Cefalométrica", "")}
              {count > 0 && (
                <span className={`ml-1.5 inline-flex items-center justify-center rounded-full text-[9px] h-4 min-w-4 px-1 ${isActive ? "bg-white/25" : "bg-primary/10 text-primary"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <SurgicalDiagram
        key={active}
        diagramId={active}
        value={value[active] ?? {}}
        onChange={(next) => updateDiagram(active, next)}
        readOnly={isFinalized}
      />
    </div>
  );
}
