/**
 * Surgical diagram registry.
 *
 * The base art is the clinic's own precise anatomical line-drawings (the exact
 * images from the paper surgical-planning form), rendered inside each diagram's
 * native pixel viewBox. The surgeon annotates on top with the freehand pen;
 * strokes are stored in the same viewBox coordinate space, so what is marked on
 * screen prints byte-for-byte the same in the PDF.
 *
 * The standard osteotomy guide lines (Le Fort = vermelho, segmentação = roxo,
 * sagital = verde, mento = azul) are already part of the clinic's drawings, so
 * there are no separate toggle lines — the surgeon simply draws.
 */
import React from "react";

import frontalImg from "@assets/diagram-frontal.png";
import lateralImg from "@assets/diagram-lateral.png";
import occlusionImg from "@assets/diagram-occlusion.png";
import molarImg from "@assets/diagram-molar.png";

export type DiagramId = "frontal" | "lateral" | "occlusion" | "molar";

export interface LineDef {
  id: string;
  label: string;
  color: string;
  d: string;
}

export interface DiagramDef {
  id: DiagramId;
  title: string;
  hint: string;
  w: number;
  h: number;
  Base: React.FC;
  lines: LineDef[];
}

/** Osteotomy colour convention (matches the clinic's paper form). */
export const OSTEO = {
  lefort: "#dc2626",
  segment: "#7c3aed",
  sagital: "#16a34a",
  mento: "#2563eb",
} as const;

/** Pen colours offered by the freehand tool. */
export const PEN_COLORS: { name: string; value: string }[] = [
  { name: "Vermelho (Le Fort)", value: OSTEO.lefort },
  { name: "Roxo (segmentação / linha média)", value: OSTEO.segment },
  { name: "Verde (sagital)", value: OSTEO.sagital },
  { name: "Azul (mento)", value: OSTEO.mento },
  { name: "Preto", value: "#111827" },
  { name: "Teal", value: "#2D6B79" },
];

function imageBase(src: string, w: number, h: number): React.FC {
  const Base: React.FC = () => (
    <image href={src} x={0} y={0} width={w} height={h} preserveAspectRatio="xMidYMid meet" />
  );
  return Base;
}

export const DIAGRAMS: DiagramDef[] = [
  {
    id: "frontal",
    title: "Crânio — Vista Frontal",
    hint: "Le Fort I, pilares, mandíbula e mento",
    w: 464,
    h: 370,
    Base: imageBase(frontalImg, 464, 370),
    lines: [],
  },
  {
    id: "lateral",
    title: "Crânio — Perfil / Lateral",
    hint: "Le Fort, sagital (BSSO) e mento",
    w: 410,
    h: 354,
    Base: imageBase(lateralImg, 410, 354),
    lines: [],
  },
  {
    id: "occlusion",
    title: "Oclusão Dentária",
    hint: "Linha média e relação oclusal",
    w: 385,
    h: 214,
    Base: imageBase(occlusionImg, 385, 214),
    lines: [],
  },
  {
    id: "molar",
    title: "Molar / Cefalométrica",
    hint: "Eixo e movimento dentário",
    w: 300,
    h: 318,
    Base: imageBase(molarImg, 300, 318),
    lines: [],
  },
];

export function getDiagram(id: DiagramId): DiagramDef {
  return DIAGRAMS.find((d) => d.id === id) ?? DIAGRAMS[0];
}
