import { useState } from "react";
import { useGetProtocol, useListPlanningImages, useListFiles3d, getListFiles3dQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { format } from "date-fns";
import logo from "@assets/clinicadaface-logo.gif";
import { Printer, ChevronLeft, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { ChecklistItemStatus, PlateRecord, ScrewRecord, DrillRecord, SawRecord, SurgicalPlan, OrthoMovements, Protocol, PreopDiagnosis, LabPrediction } from "@workspace/api-client-react";
import { LAB_CHECKS, checkOptionLabel } from "./form-sections/lab-prediction-section";
import { AnatomicalMapPrint } from "@/components/anatomical-map";
import { SurgicalDiagramStatic } from "@/components/surgical-diagram";
import { DIAGRAMS } from "@/components/surgical-diagrams/diagrams";

// ─── Helpers ────────────────────────────────────────────────────────────────

const PLATE_TYPE_LABELS: Record<string, string> = {
  L_left_4h:  "L Esq. 4 Furos",
  L_right_4h: "L Dir. 4 Furos",
  L_left_6h:  "L Esq. 6 Furos",
  L_right_6h: "L Dir. 6 Furos",
  BSSO_right: "BSSO Direita",
  BSSO_left:  "BSSO Esquerda",
  square:     "Quadrada/Cruciforme",
  chin:       "Mento",
  straight:   "Reta",
  custom:     "Personalizada",
};

const SCREW_TYPE_LABELS: Record<string, string> = {
  monocortical: "Monocortical",
  bicortical:   "Bicortical",
  lag:          "Compressão",
  positional:   "Posicional",
};

const ZONE_LABELS: Record<string, string> = {
  pilar_canino_dir:    "Pilar Canino Dir.",
  pilar_canino_esq:    "Pilar Canino Esq.",
  pilar_zigomatico_dir:"Pilar Zigomático Dir.",
  pilar_zigomatico_esq:"Pilar Zigomático Esq.",
  bordo_inf_dir:       "Bordo Inf. Dir.",
  bordo_inf_esq:       "Bordo Inf. Esq.",
  bordo_ant_dir:       "Bordo Ant. Dir.",
  bordo_ant_esq:       "Bordo Ant. Esq.",
  mento:               "Mento",
  custom:              "Outro",
};

function screwSummary(screw: ScrewRecord): string {
  const parts: string[] = [];
  if (screw.quantity) parts.push(`${screw.quantity}×`);
  if (screw.diameter) parts.push(`Ø${screw.diameter}mm`);
  if (screw.length) parts.push(`×${screw.length === 0 && screw.lengthCustom ? screw.lengthCustom : screw.length}mm`);
  if (screw.screwType) parts.push(`(${SCREW_TYPE_LABELS[screw.screwType] ?? screw.screwType})`);
  if (screw.selfTapping) parts.push("AP");
  return parts.join(" ");
}

// ─── Plano Cirúrgico print sub-section ──────────────────────────────────────

const MAXILLA_OSTEOTOMY_LABELS: Record<string, string> = {
  LeFort_I: "LeFort I Standard",
  LeFort_II: "LeFort II",
  LeFort_III: "LeFort III",
  segmented: "LeFort I Segmentada",
  expansion: "Expansão",
  SARPE: "SARPE",
};

const MANDIBLE_OSTEOTOMY_LABELS: Record<string, string> = {
  BSSO: "BSSO (Sagital Bilateral)",
  vertical_ramus: "Ramo Vertical",
  intraoral_vertical_ramus: "Ramo Vertical Intraoral",
  genioplasty_only: "Apenas Mentoplastia",
  distraction: "Distração Osteogénica",
};

const CHIN_PROCEDURE_LABELS: Record<string, string> = {
  advancement: "Avanço",
  setback: "Recuo",
  vertical_reduction: "Redução Vertical",
  vertical_augmentation: "Aumento Vertical",
  asymmetry_correction: "Correção de Assimetria",
};

const CONDYLAR_LABELS: Record<string, string> = {
  manual: "Manual / Passivo",
  navigation: "Navegação",
  splint: "Goteira de Posicionamento",
};

function fmtMm(value: number | null | undefined): string {
  return value === null || value === undefined || Number.isNaN(value) ? "—" : `${value} mm`;
}

function fmtDeg(value: number | null | undefined): string {
  return value === null || value === undefined || Number.isNaN(value) ? "—" : `${value}°`;
}

const SEGMENT_PRINT_LABELS: Record<string, string> = {
  total: "Total",
  anterior: "Seg. Anterior",
  posterior_left: "Seg. Posterior Esq.",
  posterior_right: "Seg. Posterior Dir.",
  left: "Seg. Esquerdo",
  right: "Seg. Direito",
};

function MovementsRow({ segment, movements }: { segment: string; movements?: OrthoMovements | null }) {
  return (
    <tr>
      <td className="border border-gray-300 px-2 py-1 font-semibold">{segment}</td>
      <td className="border border-gray-300 px-2 py-1 text-center font-mono">{fmtMm(movements?.sagittal)}</td>
      <td className="border border-gray-300 px-2 py-1 text-center font-mono">{fmtMm(movements?.vertical)}</td>
      <td className="border border-gray-300 px-2 py-1 text-center font-mono">{fmtMm(movements?.transverseRight)}</td>
      <td className="border border-gray-300 px-2 py-1 text-center font-mono">{fmtMm(movements?.transverseLeft)}</td>
      <td className="border border-gray-300 px-2 py-1 text-center font-mono">{fmtDeg(movements?.rotation)}</td>
    </tr>
  );
}

function SurgicalPlanPrint({ plan }: { plan: SurgicalPlan }) {
  const maxilla = plan.maxilla?.included ? plan.maxilla : undefined;
  const mandible = plan.mandible?.included ? plan.mandible : undefined;
  const chin = plan.chin?.included ? plan.chin : undefined;
  const associated = plan.associated || [];
  if (!maxilla && !mandible && !chin && associated.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-sm font-bold uppercase tracking-widest bg-gray-100 p-2 mb-4 border-l-4 border-primary">
        Plano Cirúrgico — Movimentos Planeados
      </h2>

      <table className="w-full text-xs border-collapse border border-gray-300 mb-3">
        <thead className="bg-gray-50">
          <tr>
            <th className="border border-gray-300 px-2 py-1 text-left">Segmento</th>
            <th className="border border-gray-300 px-2 py-1 text-center">Avanço/Recuo<br />(Sagital)</th>
            <th className="border border-gray-300 px-2 py-1 text-center">Impacção/Descida<br />(Vertical)</th>
            <th className="border border-gray-300 px-2 py-1 text-center">Transverso Dir.</th>
            <th className="border border-gray-300 px-2 py-1 text-center">Transverso Esq.</th>
            <th className="border border-gray-300 px-2 py-1 text-center">Rotação (Yaw)</th>
          </tr>
        </thead>
        <tbody>
          {maxilla &&
            (maxilla.segments && maxilla.segments.length > 1 ? (
              maxilla.segments.map((seg, i) => (
                <MovementsRow
                  key={i}
                  segment={`Maxila — ${SEGMENT_PRINT_LABELS[seg.segment as string] || seg.segment || "Total"}`}
                  movements={seg.movements}
                />
              ))
            ) : (() => {
              const m = maxilla.segments?.[0]?.movements;
              const hasSides = m && (m.sagittalRight != null || m.sagittalLeft != null || m.verticalRight != null || m.verticalLeft != null);
              return hasSides ? (
                <>
                  <MovementsRow segment="Maxila — Dta. (ENP)" movements={{ sagittal: m!.sagittalRight, vertical: m!.verticalRight, transverseRight: m!.transverseRight, rotation: m!.rotation }} />
                  <MovementsRow segment="Maxila — Esq. (ponto A)" movements={{ sagittal: m!.sagittalLeft, vertical: m!.verticalLeft, transverseLeft: m!.transverseLeft }} />
                </>
              ) : (
                <MovementsRow segment="Maxila" movements={m} />
              );
            })())}
          {mandible && <MovementsRow segment="Mandíbula" movements={mandible.movements} />}
          {chin && <MovementsRow segment="Mento" movements={chin.movements} />}
        </tbody>
      </table>

      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
        {maxilla && (
          <div>
            <span className="font-semibold text-gray-600">Maxila:</span>{" "}
            {maxilla.osteotomyType ? (MAXILLA_OSTEOTOMY_LABELS[maxilla.osteotomyType] || maxilla.osteotomyType) : "LeFort I Standard"}
            {maxilla.bonGraft ? ` • Enxerto ósseo${maxilla.graftSource ? ` (${maxilla.graftSource})` : ""}` : ""}
            {maxilla.notes ? ` • ${maxilla.notes}` : ""}
          </div>
        )}
        {mandible && (
          <div>
            <span className="font-semibold text-gray-600">Mandíbula:</span>{" "}
            {mandible.osteotomyType ? (MANDIBLE_OSTEOTOMY_LABELS[mandible.osteotomyType] || mandible.osteotomyType) : "BSSO (Sagital Bilateral)"}
            {mandible.condylarPositioning ? ` • Condilar: ${CONDYLAR_LABELS[mandible.condylarPositioning] || mandible.condylarPositioning}` : ""}
            {mandible.notes ? ` • ${mandible.notes}` : ""}
          </div>
        )}
        {chin && (
          <div>
            <span className="font-semibold text-gray-600">Mento:</span>{" "}
            {chin.procedure ? (CHIN_PROCEDURE_LABELS[chin.procedure] || chin.procedure) : "Mentoplastia"}
            {chin.notes ? ` • ${chin.notes}` : ""}
          </div>
        )}
        {associated.length > 0 && (
          <div className="col-span-2">
            <span className="font-semibold text-gray-600">Procedimentos associados:</span>{" "}
            {associated.map((p) => `${p.name}${p.details ? ` (${p.details})` : ""}`).join("; ")}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Osteossíntese print sub-section ────────────────────────────────────────

function OsteosynthesisPrint({ plates, drills, saws }: {
  plates: PlateRecord[];
  drills?: DrillRecord[];
  saws?: SawRecord[];
}) {
  if (!plates.length && !drills?.length && !saws?.length) return null;

  return (
    <div className="mb-8">
      <h2 className="text-sm font-bold uppercase tracking-widest bg-gray-100 p-2 mb-4 border-l-4 border-primary">
        Materiais de Osteossíntese
      </h2>

      <div className="flex gap-6 items-start mb-5">
        {/* Anatomical map */}
        <div className="flex-shrink-0">
          <AnatomicalMapPrint plates={plates} />
        </div>

        {/* Plates summary */}
        <div className="flex-1">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
            Placas Utilizadas — {plates.length} placa{plates.length !== 1 ? "s" : ""}
          </div>
          <table className="w-full text-xs border-collapse border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="border border-gray-300 px-2 py-1 text-left">#</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Tipo</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Zona</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Marca / Sistema</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Referência</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Lote</th>
                <th className="border border-gray-300 px-2 py-1 text-center">Qtd</th>
              </tr>
            </thead>
            <tbody>
              {plates.map((plate, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="border border-gray-300 px-2 py-1 text-center font-mono text-gray-500">{idx + 1}</td>
                  <td className="border border-gray-300 px-2 py-1 font-semibold">
                    {plate.plateType ? (PLATE_TYPE_LABELS[plate.plateType] || plate.type || plate.plateType) : (plate.type || "—")}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-gray-700">
                    {plate.anatomicalZone ? (ZONE_LABELS[plate.anatomicalZone] || plate.location || "—") : (plate.location || "—")}
                  </td>
                  <td className="border border-gray-300 px-2 py-1">{plate.brand || "—"} {plate.system || ""}</td>
                  <td className="border border-gray-300 px-2 py-1 font-mono text-gray-700">{plate.reference || "—"}</td>
                  <td className="border border-gray-300 px-2 py-1 font-mono text-gray-700">{plate.lot || "—"}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{plate.quantity || 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-plate screws detail */}
      {plates.some(p => p.screws && p.screws.length > 0) && (
        <div className="mb-4">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Detalhe de Parafusos por Placa</div>
          <table className="w-full text-[11px] border-collapse border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="border border-gray-300 px-2 py-1 text-left">Placa</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Tipo</th>
                <th className="border border-gray-300 px-2 py-1 text-center">Auto-Perf.</th>
                <th className="border border-gray-300 px-2 py-1 text-center">Diâm.</th>
                <th className="border border-gray-300 px-2 py-1 text-center">Comp.</th>
                <th className="border border-gray-300 px-2 py-1 text-center">Qtd.</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Referência</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Lote</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Localização</th>
              </tr>
            </thead>
            <tbody>
              {plates.flatMap((plate, pi) =>
                (plate.screws || []).map((screw, si) => {
                  const plateLabel = plate.plateType
                    ? (PLATE_TYPE_LABELS[plate.plateType] || plate.type || `#${pi + 1}`)
                    : `#${pi + 1}`;
                  const zoneLabel = plate.anatomicalZone
                    ? (ZONE_LABELS[plate.anatomicalZone] || plate.location || "")
                    : (plate.location || "");
                  return (
                    <tr key={`${pi}-${si}`} className={pi % 2 === 0 ? "bg-white" : "bg-gray-50/30"}>
                      {si === 0 && (
                        <td
                          className="border border-gray-300 px-2 py-1 font-semibold align-top"
                          rowSpan={plate.screws!.length}
                        >
                          <div>{plateLabel}</div>
                          {zoneLabel && <div className="text-gray-500 font-normal text-[10px]">{zoneLabel}</div>}
                        </td>
                      )}
                      <td className="border border-gray-300 px-2 py-1">{screw.screwType ? (SCREW_TYPE_LABELS[screw.screwType] ?? screw.screwType) : "—"}</td>
                      <td className="border border-gray-300 px-2 py-1 text-center">{screw.selfTapping ? "✓" : "—"}</td>
                      <td className="border border-gray-300 px-2 py-1 text-center font-mono">{screw.diameter ? `Ø${screw.diameter}` : "—"}</td>
                      <td className="border border-gray-300 px-2 py-1 text-center font-mono">
                        {screw.length === 0 ? (screw.lengthCustom ? `${screw.lengthCustom}mm` : "—") : (screw.length ? `${screw.length}mm` : "—")}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-center font-semibold">{screw.quantity ?? "—"}</td>
                      <td className="border border-gray-300 px-2 py-1 font-mono text-gray-700">{screw.reference || "—"}</td>
                      <td className="border border-gray-300 px-2 py-1 font-mono text-gray-700">{screw.lot || "—"}</td>
                      <td className="border border-gray-300 px-2 py-1 text-gray-600">{screw.location || "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Drills */}
      {(drills || []).length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Brocas Utilizadas</div>
          <table className="w-full text-xs border-collapse border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="border border-gray-300 px-2 py-1 text-left">Marca</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Diâm. (mm)</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Tipo</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Referência</th>
                <th className="border border-gray-300 px-2 py-1 text-center">Nº Utilizações</th>
              </tr>
            </thead>
            <tbody>
              {(drills || []).map((d, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="border border-gray-300 px-2 py-1">{d.brand || "—"}</td>
                  <td className="border border-gray-300 px-2 py-1 font-mono">{d.diameter || "—"}</td>
                  <td className="border border-gray-300 px-2 py-1">{d.drillType === "twist" ? "Helicoidal" : d.drillType === "step" ? "Escalonada" : "—"}</td>
                  <td className="border border-gray-300 px-2 py-1 font-mono text-gray-700">{d.reference || "—"}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{d.usedCount ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Saws */}
      {(saws || []).length > 0 && (
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Serras / Lâminas Utilizadas</div>
          <table className="w-full text-xs border-collapse border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="border border-gray-300 px-2 py-1 text-left">Marca</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Tipo</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Ref. Lâmina</th>
                <th className="border border-gray-300 px-2 py-1 text-center">Nº Utilizações</th>
              </tr>
            </thead>
            <tbody>
              {(saws || []).map((s, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="border border-gray-300 px-2 py-1">{s.brand || "—"}</td>
                  <td className="border border-gray-300 px-2 py-1">
                    {s.sawType === "oscillating" ? "Oscilante" : s.sawType === "sagittal" ? "Sagital" : s.sawType === "reciprocating" ? "Recíproca" : "—"}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 font-mono text-gray-700">{s.bladeRef || "—"}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{s.usedCount ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Seleção de secções & presets ────────────────────────────────────────────

type SectionKey =
  | "identification" | "surgeryData" | "team" | "diagnosis" | "labPrediction"
  | "checklist" | "plan" | "planningImages" | "clinicalPhotos" | "sequence"
  | "intraop" | "materials" | "operativeReport" | "recommendations"
  | "homeMedication" | "nextAppointment" | "internalNotes" | "diagrams"
  | "files3d" | "piezo" | "summary" | "medicalActs";

const SECTION_DEFS: Array<{ key: SectionKey; label: string }> = [
  { key: "identification", label: "Identificação do doente" },
  { key: "surgeryData", label: "Dados da cirurgia / internamento" },
  { key: "team", label: "Equipa cirúrgica" },
  { key: "diagnosis", label: "Diagnóstico" },
  { key: "labPrediction", label: "Previsão Laboratorial" },
  { key: "checklist", label: "Checklist pré-operatória" },
  { key: "plan", label: "Plano cirúrgico (movimentos)" },
  { key: "planningImages", label: "Imagens de planeamento" },
  { key: "clinicalPhotos", label: "Fotografia clínica" },
  { key: "sequence", label: "Sequência cirúrgica" },
  { key: "intraop", label: "Registo intra-operatório" },
  { key: "materials", label: "Materiais de osteossíntese" },
  { key: "diagrams", label: "Diagramas cirúrgicos" },
  { key: "files3d", label: "Inventário de ficheiros 3D" },
  { key: "piezo", label: "Equipamento piezoelétrico" },
  { key: "medicalActs", label: "Atos médicos (códigos OM / valores K)" },
  { key: "operativeReport", label: "Relato operatório" },
  { key: "recommendations", label: "Recomendações pós-operatórias" },
  { key: "homeMedication", label: "Medicação para domicílio" },
  { key: "nextAppointment", label: "Próxima consulta" },
  { key: "summary", label: "Resumo (Notas de Alta)" },
  { key: "internalNotes", label: "Observações internas" },
];

type DocStyle = "protocolo" | "nota_cdf" | "nota_bloco" | "relatorio";

const ALL_KEYS = SECTION_DEFS.map((s) => s.key);

const PRESETS: Array<{ id: string; label: string; style: DocStyle; sections: SectionKey[] }> = [
  {
    id: "nota_cdf",
    label: "Nota de Alta — Clínica da Face",
    style: "nota_cdf",
    sections: ["identification", "surgeryData", "diagnosis", "operativeReport", "recommendations", "summary"],
  },
  {
    id: "nota_bloco",
    label: "Nota de Alta — Doente (O Bloco)",
    style: "nota_bloco",
    sections: ["identification", "surgeryData", "operativeReport", "recommendations", "homeMedication", "nextAppointment"],
  },
  {
    id: "completo",
    label: "Protocolo Interno Completo",
    style: "protocolo",
    sections: ALL_KEYS.filter((k) => k !== "summary"),
  },
  {
    id: "dia_cirurgia",
    label: "Checklist Dia da Cirurgia",
    style: "protocolo",
    sections: ["identification", "labPrediction", "checklist"],
  },
  {
    id: "relato",
    label: "Apenas Relato Operatório",
    style: "protocolo",
    sections: ["identification", "operativeReport"],
  },
  {
    id: "relatorio_seguradora",
    label: "Relatório Clínico Pré-operatório (Seguradora)",
    style: "relatorio",
    sections: ["identification", "diagnosis", "surgeryData", "medicalActs", "team"],
  },
];

// ─── Atos médicos (Nomenclatura da Ordem dos Médicos) ────────────────────────
// Derivados automaticamente do plano cirúrgico gravado.
interface MedicalAct { code: string; name: string; k: string }

function deriveMedicalActs(plan?: SurgicalPlan | null): MedicalAct[] {
  if (!plan) return [];
  const acts: MedicalAct[] = [];
  const assoc = plan.associated ?? [];
  const textOf = (a: { name?: string; details?: string }) => `${a.name ?? ""} ${a.details ?? ""}`.toLowerCase();
  const assocMatch = (...terms: string[]) => assoc.some((a) => terms.some((t) => textOf(a).includes(t)));
  const nasal = (plan.nasalNotes ?? "").toLowerCase();

  if (plan.mandible?.included && plan.mandible.osteotomyType !== "genioplasty_only") {
    acts.push({ code: "33.00.00.23", name: "Osteoplastia mandibular", k: "K 300" });
  }
  if (assocMatch("segmentar mand", "mandíbula segmentar", "mandibula segmentar")) {
    acts.push({ code: "33.00.00.24", name: "Osteoplastia da mandíbula segmentar", k: "K 200" });
  }
  const mx = plan.maxilla;
  if (mx?.included) {
    // Tipo por omissão: o formulário trata maxila incluída sem tipo como LeFort I
    const t = mx.osteotomyType || "LeFort_I";
    const segmented = t === "segmented" || (mx.segments ?? []).some((s) => s.segment && s.segment !== "total");
    if (t.startsWith("LeFort") || segmented) {
      acts.push({ code: "33.00.00.26", name: "Osteoplastia do maxilar superior, tipo LeFort I", k: "K 200" });
    }
    if (segmented) {
      acts.push({ code: "33.00.00.31", name: "Osteotomia segmentar do maxilar superior", k: "K 150" });
    }
    if (t === "expansion" || t === "SARPE") {
      acts.push({ code: "33.00.00.33", name: "Disjunção intermaxilar", k: "K 150" });
    }
  }
  if (assocMatch("septo") || nasal.includes("septo")) {
    acts.push({ code: "34.00.00.23", name: "Septoplastia", k: "K 120" });
  }
  if (assocMatch("corneto", "turbin") || nasal.includes("corneto")) {
    acts.push({ code: "34.00.00.06", name: "Eletrocoagulação dos cornetos bilateral", k: "K 036" });
  }
  if (plan.chin?.included || plan.mandible?.osteotomyType === "genioplasty_only") {
    acts.push({ code: "30.02.00.32", name: "Mentoplastia com osteotomias de avanço", k: "K 120" });
  }
  return acts;
}

function emptySelection(): Record<SectionKey, boolean> {
  return Object.fromEntries(ALL_KEYS.map((k) => [k, false])) as Record<SectionKey, boolean>;
}

// ─── Helpers de conteúdo ─────────────────────────────────────────────────────

function stayDuration(admission?: string | null, discharge?: string | null): string | null {
  if (!admission || !discharge) return null;
  const a = new Date(admission);
  const d = new Date(discharge);
  if (isNaN(a.getTime()) || isNaN(d.getTime()) || d <= a) return null;
  return `${Math.round((d.getTime() - a.getTime()) / 3600000)} horas`;
}

function fmtDateTime(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : format(d, "dd/MM/yyyy 'às' HH:mm");
}

const SKELETAL_LABELS: Record<string, string> = { I: "Classe I", II: "Classe II", III: "Classe III" };
const VERTICAL_LABELS: Record<string, string> = {
  normodivergent: "normodivergente",
  hyperdivergent: "hiperdivergente",
  hypodivergent: "hipodivergente",
};

function diagnosisNarrative(diag?: PreopDiagnosis | null): string {
  if (!diag) return "";
  const parts: string[] = [];
  if (diag.skeletalClass) parts.push(`Deformidade dento-maxilo-facial — ${SKELETAL_LABELS[diag.skeletalClass] || diag.skeletalClass} esquelética`);
  if (diag.verticalPattern) parts.push(`padrão ${VERTICAL_LABELS[diag.verticalPattern] || diag.verticalPattern}`);
  if (diag.facialAsymmetry) parts.push(`assimetria facial${diag.asymmetryDetails ? ` (${diag.asymmetryDetails})` : ""}`);
  if (diag.openBite) parts.push("mordida aberta");
  if (diag.crossBite) parts.push("mordida cruzada");
  if (diag.airwayCompromise) parts.push("compromisso da via aérea");
  if (diag.tmjSymptoms) parts.push("sintomatologia da ATM");
  let text = parts.join(", ");
  if (text) text += ".";
  if (diag.additionalNotes) text += (text ? "\n" : "") + diag.additionalNotes;
  return text;
}

const MALLAMPATI_LABELS: Record<string, string> = { I: "I", II: "II", III: "III", IV: "IV" };
const SURGERY_START_LABELS: Record<string, string> = { mandibula: "Mandíbula", maxila: "Maxila" };
const COMPLEMENT_LABELS: Array<{ key: "septoplasty" | "segmented" | "mentoplasty" | "atmProsthesis"; label: string }> = [
  { key: "septoplasty", label: "Septoplastia" },
  { key: "segmented", label: "Segmentar" },
  { key: "mentoplasty", label: "Mentoplastia" },
  { key: "atmProsthesis", label: "Prótese ATM" },
];

function LabPredictionPrint({ lab }: { lab: LabPrediction }) {
  const checks = lab.checks ?? [];
  const complements = lab.complements ?? {};
  const activeComplements = COMPLEMENT_LABELS.filter((c) => complements[c.key]);
  return (
    <div className="mb-8">
      <h2 className="text-sm font-bold uppercase tracking-widest bg-gray-100 p-2 mb-4 border-l-4 border-primary">
        Previsão Laboratorial
      </h2>
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-4">
        <div><span className="font-semibold text-gray-600">Mallampati:</span> {lab.mallampati ? MALLAMPATI_LABELS[lab.mallampati] || lab.mallampati : "—"}</div>
        <div><span className="font-semibold text-gray-600">Início da cirurgia:</span> {lab.surgeryStart ? SURGERY_START_LABELS[lab.surgeryStart] || lab.surgeryStart : "—"}</div>
        {lab.specialCare && (
          <div className="col-span-2"><span className="font-semibold text-gray-600">Cuidados especiais:</span> {lab.specialCare}</div>
        )}
        <div className="col-span-2">
          <span className="font-semibold text-gray-600">Complementos:</span>{" "}
          {activeComplements.length > 0 || complements.other
            ? [...activeComplements.map((c) => c.label), ...(complements.other ? [complements.other] : [])].join(" • ")
            : "—"}
        </div>
      </div>
      {checks.length > 0 && (
        <table className="w-full text-xs border-collapse border border-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="border border-gray-300 px-2 py-1 text-left w-8">Nº</th>
              <th className="border border-gray-300 px-2 py-1 text-left">Verificação</th>
              <th className="border border-gray-300 px-2 py-1 text-left">Resultado</th>
              <th className="border border-gray-300 px-2 py-1 text-center">Lado</th>
              <th className="border border-gray-300 px-2 py-1 text-center">mm</th>
              <th className="border border-gray-300 px-2 py-1 text-left">Nota</th>
            </tr>
          </thead>
          <tbody>
            {LAB_CHECKS.map((def, i) => {
              const check = checks.find((c) => c.id === def.id);
              return (
                <tr key={def.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="border border-gray-300 px-2 py-1 text-center font-mono">{def.id}</td>
                  <td className="border border-gray-300 px-2 py-1">{def.label.replace(/^\d+\s—\s/, "")}</td>
                  <td className="border border-gray-300 px-2 py-1 font-semibold">{check?.option ? checkOptionLabel(def.id, check.option) : "—"}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{check?.side || "—"}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center font-mono">{check?.valueMm ?? "—"}</td>
                  <td className="border border-gray-300 px-2 py-1 text-gray-600">{check?.note || def.fixedNote || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Rodapé & assinatura ─────────────────────────────────────────────────────

function ClinicFooter({ legal }: { legal?: boolean }) {
  return (
    <div className="mt-10 pt-4 border-t border-gray-400 text-center text-[10px] text-gray-600 leading-relaxed">
      {legal && (
        <p className="mb-2 italic text-gray-500">
          Relatório ao abrigo do Artigo 98, § 1 e 2 do Código Deontológico da Ordem dos Médicos.
          Relatório assinado digitalmente. Esta é uma impressão do original que está disponível para consulta, nos termos da Lei.
        </p>
      )}
      <p className="font-semibold text-gray-700">Clínica da Face — Complexo Hospitalar das Torres de Lisboa</p>
      <p>Rua Tomás da Fonseca, Torre F, Piso 1 · 1600-209 Lisboa – Portugal</p>
      <p>Tel. +351 21 721 09 00 · +351 93 721 09 00 · clinica@clinicadaface.com · www.clinicadaface.com</p>
    </div>
  );
}

function SurgeonSignature() {
  return (
    <div className="mt-16 flex justify-end pr-8">
      <div className="text-center w-64">
        <div className="border-b border-black mb-2 h-14"></div>
        <div className="text-xs font-bold">A. Matos da Fonseca</div>
        <div className="text-[10px] uppercase tracking-widest text-gray-500">Cirurgia Maxilo-Facial</div>
      </div>
    </div>
  );
}

function PrintSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-bold uppercase tracking-widest bg-gray-100 p-2 mb-4 border-l-4 border-primary">{title}</h2>
      {children}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function ProtocolPrint() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";

  const { data: protocol, isLoading } = useGetProtocol(Number(id), {
    query: { enabled: !isNew, queryKey: ['getProtocol', Number(id)] }
  });

  const { data: planningImages = [] } = useListPlanningImages(Number(id), {}, {
    query: { enabled: !isNew, queryKey: ['planningImages', Number(id)] }
  });

  const { data: files3d = [] } = useListFiles3d(Number(id), {
    query: { enabled: !isNew, queryKey: getListFiles3dQueryKey(Number(id)) }
  });

  // Seleção de secções — nunca imprimir tudo automaticamente:
  // começa vazia; o utilizador escolhe um preset ou marca as secções.
  const [sel, setSel] = useState<Record<SectionKey, boolean>>(emptySelection);
  const [docStyle, setDocStyle] = useState<DocStyle>("protocolo");
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const applyPreset = (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const next = emptySelection();
    preset.sections.forEach((k) => { next[k] = true; });
    setSel(next);
    setDocStyle(preset.style);
    setActivePreset(presetId);
  };

  const toggleSection = (key: SectionKey) => {
    setSel((prev) => ({ ...prev, [key]: !prev[key] }));
    setActivePreset(null);
  };

  const selectedCount = ALL_KEYS.filter((k) => sel[k]).length;
  const isNota = docStyle === "nota_cdf" || docStyle === "nota_bloco";

  const CLINICAL_PHOTO_CATEGORIES = ["foto_extraoral", "foto_intraoral", "foto_clinica_outra"];
  const CLINICAL_PHOTO_LABELS: Record<string, string> = {
    foto_extraoral: "Extraoral",
    foto_intraoral: "Intraoral",
    foto_clinica_outra: "Outra",
  };
  const FILE_3D_TYPE_LABELS: Record<string, string> = {
    scanner_intraoral: "Scanner Intraoral",
    modelo_dentario: "Modelo Dentário",
    maxila: "Maxila",
    mandibula: "Mandíbula",
    cranio: "Crânio Completo",
    splint: "Splint / Goteira",
    guia_cirurgica: "Guia Cirúrgica",
    outro: "Outro",
  };

  // PDFs não podem ser embebidos como <img> — excluir do relatório impresso
  const isPdfDoc = (img: { originalName?: string | null; objectPath?: string | null }) =>
    !!(img.originalName?.toLowerCase().endsWith(".pdf") || img.objectPath?.toLowerCase().endsWith(".pdf"));
  const headerPhoto = planningImages.find(img => img.isHeaderPhoto && img.includeInPdf && !isPdfDoc(img));
  const clinicalPhotos = planningImages.filter(
    img => img.includeInPdf && CLINICAL_PHOTO_CATEGORIES.includes(img.category) && !isPdfDoc(img)
  );
  const pdfImages = planningImages.filter(
    img => img.includeInPdf && !CLINICAL_PHOTO_CATEGORIES.includes(img.category) && !isPdfDoc(img)
  );
  const pdfFiles3d = files3d.filter(f => f.includeInPdf);
  const piezo = protocol?.piezoEquipment;
  const piezoUsed = piezo && piezo.brand && piezo.brand !== "nao_utilizado";
  const diagrams = protocol?.surgicalDiagrams;
  const printedDiagrams = DIAGRAMS.filter((d) => {
    const a = diagrams?.[d.id];
    if (!a || a.includeInPdf === false) return false;
    const hasLines = a.lines && Object.values(a.lines).some(Boolean);
    const hasStrokes = (a.strokes?.length ?? 0) > 0;
    return hasLines || hasStrokes;
  });
  const isDemo = protocol?.processNumber?.startsWith("DEMO-") ?? false;

  if (isLoading) {
    return <div className="p-12 max-w-4xl mx-auto"><Skeleton className="h-64 w-full" /></div>;
  }

  if (!protocol) {
    return <div className="p-12 text-center">Protocolo não encontrado.</div>;
  }

  const handlePrint = () => {
    if (selectedCount === 0) return;
    window.print();
  };

  const checkStatusLabel = {
    [ChecklistItemStatus.ok]: "Ok",
    [ChecklistItemStatus.missing]: "Em falta",
    [ChecklistItemStatus.na]: "N/A"
  };

  const plates = protocol.materials?.plates ?? [];
  const drills = protocol.materials?.drills ?? [];
  const saws   = protocol.materials?.saws   ?? [];
  const duration = stayDuration(protocol.admissionDateTime, protocol.dischargeDateTime);
  const diagText = diagnosisNarrative(protocol.preopDiagnosis);

  const docTitle =
    docStyle === "nota_cdf" ? "Nota de Alta"
    : docStyle === "nota_bloco" ? "Nota de Alta"
    : docStyle === "relatorio" ? "Relatório Clínico"
    : "Protocolo Operatório";
  const isRelatorio = docStyle === "relatorio";
  const medicalActs = deriveMedicalActs(protocol.surgicalPlan);
  const surgeonOm = protocol.team?.surgeonOmNumber || "21892";
  const surgeonName = protocol.team?.surgeon || "Dr. Matos da Fonseca";

  // ── Blocos partilhados ──
  const identificationBlock = sel.identification && (
    <PrintSection title="Identificação do Doente">
      <div className="flex gap-4 items-start">
        {headerPhoto && !isNota && (
          <img
            src={headerPhoto.servingUrl}
            alt="Fotografia do doente"
            className="w-28 h-28 object-cover border border-gray-300 flex-shrink-0"
          />
        )}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm flex-1">
          <div><span className="font-semibold text-gray-600">Nome:</span> {protocol.patientName}</div>
          <div>
            <span className="font-semibold text-gray-600">Idade / Sexo:</span> {protocol.patientAge || "-"} anos / {protocol.patientGender === "M" ? "Masc" : protocol.patientGender === "F" ? "Fem" : "-"}
          </div>
          <div><span className="font-semibold text-gray-600">Proc. Nº:</span> {protocol.processNumber}</div>
          {protocol.utenteNumber && <div><span className="font-semibold text-gray-600">Nº de Utente:</span> {protocol.utenteNumber}</div>}
          {protocol.citizenCardNumber && <div><span className="font-semibold text-gray-600">Nº Cartão de Cidadão:</span> {protocol.citizenCardNumber}</div>}
          <div className="col-span-2"><span className="font-semibold text-gray-600">Procedimento:</span> <span className="font-bold">{protocol.surgeryType}</span></div>
        </div>
      </div>
    </PrintSection>
  );

  const surgeryDataBlock = sel.surgeryData && (isRelatorio ? (
    // Estrutura do Relatório Clínico para seguradoras (modelos CL II / CL III)
    <PrintSection title="Terapêutica Cirúrgica Ortognática">
      <div className="text-sm leading-relaxed font-serif space-y-1">
        <p><span className="font-semibold">Data da intervenção cirúrgica</span> — {protocol.surgeryDate ? format(new Date(protocol.surgeryDate), "dd/MM/yyyy") : "a agendar"}</p>
        <p><span className="font-semibold">Local da intervenção</span> — {protocol.hospital || "a definir"}</p>
        <p><span className="font-semibold">Tempo de Internamento Previsto</span> — {protocol.expectedStay || "24 Horas"}</p>
      </div>
    </PrintSection>
  ) : (
    <PrintSection title="Dados da Cirurgia / Internamento">
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
        {protocol.hospital && <div><span className="font-semibold text-gray-600">Hospital:</span> {protocol.hospital}</div>}
        <div><span className="font-semibold text-gray-600">Data da cirurgia:</span> {protocol.surgeryDate ? format(new Date(protocol.surgeryDate), "dd/MM/yyyy") : "—"}</div>
        <div><span className="font-semibold text-gray-600">Cirurgião:</span> {protocol.team?.surgeon || "A. Matos da Fonseca"}</div>
        {protocol.expectedStay && <div><span className="font-semibold text-gray-600">Internamento previsto:</span> {protocol.expectedStay}</div>}
        <div><span className="font-semibold text-gray-600">Internamento:</span> {fmtDateTime(protocol.admissionDateTime)}</div>
        <div><span className="font-semibold text-gray-600">Alta:</span> {fmtDateTime(protocol.dischargeDateTime)}</div>
        {duration && <div><span className="font-semibold text-gray-600">Duração do internamento:</span> {duration}</div>}
      </div>
    </PrintSection>
  ));

  const medicalActsBlock = sel.medicalActs && (
    <PrintSection title="Atos Médicos">
      <div className="text-sm leading-relaxed font-serif">
        <p className="mb-2">
          Baseado na Tabela de Código de Nomenclatura e Valor Relativo de Actos Médicos da Ordem dos Médicos —
          sob anestesia geral realização de:
        </p>
        {medicalActs.length > 0 ? (
          <table className="w-full text-sm border-collapse">
            <tbody>
              {medicalActs.map((a) => (
                <tr key={a.code}>
                  <td className="py-0.5 pr-4 font-mono whitespace-nowrap align-top">{a.code}</td>
                  <td className="py-0.5 pr-4">{a.name}</td>
                  <td className="py-0.5 font-semibold whitespace-nowrap text-right">{a.k}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500 italic">Sem atos médicos derivados do plano cirúrgico — complete o plano primeiro.</p>
        )}
      </div>
    </PrintSection>
  );

  const nextAppointmentBlock = sel.nextAppointment && (protocol.nextAppointmentDate || protocol.nextAppointmentTime) && (
    <PrintSection title="Próxima Consulta">
      <div className="text-sm">
        {protocol.nextAppointmentDate ? format(new Date(protocol.nextAppointmentDate), "dd/MM/yyyy") : ""}
        {protocol.nextAppointmentTime ? ` às ${protocol.nextAppointmentTime}` : ""}
        {` — ${protocol.nextAppointmentLocation || "Clínica da Face"}`}
      </div>
    </PrintSection>
  );

  const recommendationsBlock = sel.recommendations && protocol.postopRecommendations && (
    <PrintSection title={isNota ? "Recomendações" : "Recomendações Pós-Operatórias"}>
      <div className="text-sm leading-relaxed whitespace-pre-wrap font-serif">{protocol.postopRecommendations}</div>
    </PrintSection>
  );

  const homeMedicationBlock = sel.homeMedication && protocol.homeMedication && (
    <PrintSection title="Medicação para Domicílio">
      <div className="text-sm leading-relaxed whitespace-pre-wrap font-serif">{protocol.homeMedication}</div>
    </PrintSection>
  );

  const operativeReportBlock = sel.operativeReport && (
    <PrintSection title={isNota ? (docStyle === "nota_bloco" ? "Relato Operatório" : "Cirurgia") : "Descritivo Operatório"}>
      <div className="text-sm leading-relaxed whitespace-pre-wrap font-serif text-justify">
        {protocol.operativeDescription || "Nenhum descritivo operatório registado."}
      </div>
    </PrintSection>
  );

  const summaryBlock = sel.summary && (
    <PrintSection title="Resumo">
      <div className="text-sm leading-relaxed font-serif">
        <p>Doente submetido(a) a {protocol.surgeryType || "cirurgia ortognática"} sob anestesia geral.</p>
        {duration && <p>Internamento com a duração de {duration}.</p>}
        {protocol.nextAppointmentDate && (
          <p>
            Próxima consulta: {format(new Date(protocol.nextAppointmentDate), "dd/MM/yyyy")}
            {protocol.nextAppointmentTime ? ` às ${protocol.nextAppointmentTime}` : ""} — {protocol.nextAppointmentLocation || "Clínica da Face"}.
          </p>
        )}
      </div>
    </PrintSection>
  );

  // O texto do Construtor de Diagnóstico (editável pelo cirurgião) tem
  // prioridade; sem ele, usa-se o resumo gerado dos campos estruturados.
  const narrativeText = protocol.preopDiagnosis?.diagnosisNarrative?.trim() || diagText;
  const diagnosisBlock = sel.diagnosis && narrativeText && (
    <PrintSection title="Diagnóstico">
      <div className="text-sm leading-relaxed whitespace-pre-wrap font-serif">{narrativeText}</div>
    </PrintSection>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Painel de seleção — oculto na impressão */}
      <div className="print:hidden bg-sidebar p-4 flex justify-between items-center sticky top-0 z-10 shadow-md">
        <Button variant="ghost" asChild className="text-white hover:text-white/80 hover:bg-white/10 uppercase tracking-widest rounded-sm">
          <Link href={`/protocols/${id}`}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Voltar ao Editor
          </Link>
        </Button>
        <Button
          onClick={handlePrint}
          disabled={selectedCount === 0}
          className="bg-white text-sidebar hover:bg-white/90 uppercase tracking-widest rounded-sm disabled:opacity-50"
        >
          <Printer className="mr-2 h-4 w-4" /> Imprimir / PDF
        </Button>
      </div>

      <div className="print:hidden max-w-[210mm] mx-auto px-4 md:px-12 pt-8">
        <div className="border border-border rounded-sm p-6 bg-muted/20">
          <div className="text-sm font-bold uppercase tracking-widest text-primary mb-1">Documento a gerar</div>
          <p className="text-xs text-muted-foreground mb-4">
            Escolha um modelo ou selecione manualmente as secções a incluir. Nada é incluído automaticamente.
          </p>
          <div className="flex flex-wrap gap-2 mb-5">
            {PRESETS.map((p) => (
              <Button
                key={p.id}
                variant={activePreset === p.id ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => applyPreset(p.id)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
            {SECTION_DEFS.map((s) => (
              <label key={s.key} className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={!!sel[s.key]} onCheckedChange={() => toggleSection(s.key)} />
                {s.label}
              </label>
            ))}
          </div>
          {selectedCount === 0 && (
            <p className="text-xs text-amber-700 mt-4 font-semibold">
              Selecione pelo menos uma secção para pré-visualizar e imprimir.
            </p>
          )}
        </div>
        {selectedCount > 0 && (
          <div className="text-xs uppercase tracking-widest text-muted-foreground mt-6 mb-2">Pré-visualização</div>
        )}
      </div>

      {/* Documento */}
      {selectedCount > 0 && (
      <div className="max-w-[210mm] mx-auto bg-white p-12 text-black print:p-0 print:m-0 border border-border/50 print:border-0 mb-12 print:mb-0 shadow-sm print:shadow-none" id="print-document">

        {/* ── DEMO BANNER ──────────────────────────────────────────── */}
        {isDemo && (
          <div className="mb-6 border-2 border-red-400 bg-red-50 p-3 flex items-start gap-3 rounded-sm print:border-red-400 print:bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold uppercase tracking-widest text-red-700">⚠ EXEMPLO — NÃO CLÍNICO</div>
              <div className="text-xs text-red-600 mt-0.5">
                Este protocolo é uma ficha de demonstração com dados completamente fictícios.
                Não deve ser utilizado para fins clínicos, legais ou administrativos.
              </div>
            </div>
          </div>
        )}

        {/* Cabeçalho com logótipo */}
        <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
          <div>
            <img src={logo} alt="Clínica da Face" className="h-16 object-contain" />
            <div className="mt-2 text-xs text-gray-500 font-serif">Cirurgia Maxilofacial &bull; Implantologia &bull; Ortodontia</div>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold uppercase tracking-widest text-primary">{docTitle}</h1>
            {sel.identification && <div className="text-sm mt-1 text-gray-600">Proc. Nº {protocol.processNumber}</div>}
            {sel.surgeryData && <div className="text-sm mt-1">Data: {protocol.surgeryDate ? format(new Date(protocol.surgeryDate), "dd/MM/yyyy") : "___/___/_____"}</div>}
            {isDemo && (
              <div className="mt-1 text-xs font-bold text-red-600 uppercase tracking-widest">⚠ DEMONSTRAÇÃO</div>
            )}
          </div>
        </div>

        {identificationBlock}
        {/* No Relatório Clínico o diagnóstico vem antes da Terapêutica (modelos CL II/III) */}
        {isRelatorio ? diagnosisBlock : surgeryDataBlock}

        {/* Avisos importantes — apenas em documentos internos */}
        {!isNota && !isRelatorio && sel.diagnosis && protocol.preopDiagnosis?.clinicalAlerts && (
          <div className="mb-8 border-2 border-red-500 bg-red-50 p-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-red-700 mb-2">⚠ Avisos Importantes</h2>
            <div className="text-sm font-semibold text-red-900 whitespace-pre-wrap">
              {protocol.preopDiagnosis.clinicalAlerts}
            </div>
          </div>
        )}

        {isRelatorio ? surgeryDataBlock : diagnosisBlock}

        {medicalActsBlock}

        {sel.team && isRelatorio && (
          <PrintSection title="Equipa">
            <div className="text-sm leading-relaxed font-serif space-y-1">
              <p>Equipa composta de Cirurgião, 1º Ajudante, 2º Ajudante, Instrumentista e Anestesista.</p>
              <p>Responsável pela Equipa Cirúrgica: {surgeonName} – Nº OM {surgeonOm}</p>
            </div>
          </PrintSection>
        )}

        {sel.team && !isRelatorio && (
          <PrintSection title="Equipa Cirúrgica">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div><span className="font-semibold text-gray-600">Cirurgião:</span> {protocol.team?.surgeon || "-"}</div>
              <div><span className="font-semibold text-gray-600">Anestesista:</span> {protocol.team?.anesthesiologist || "-"}</div>
              <div><span className="font-semibold text-gray-600">1º Ajudante:</span> {protocol.team?.firstAssistant || "-"}</div>
              <div><span className="font-semibold text-gray-600">Instrumentista:</span> {protocol.team?.instrumentist || "-"}</div>
              <div><span className="font-semibold text-gray-600">2º Ajudante:</span> {protocol.team?.secondAssistant || "-"}</div>
              <div><span className="font-semibold text-gray-600">Circulante:</span> {protocol.team?.scrubNurse || "-"}</div>
            </div>
          </PrintSection>
        )}

        {sel.labPrediction && protocol.labPrediction && <LabPredictionPrint lab={protocol.labPrediction} />}

        {sel.checklist && (protocol.checklist?.length ?? 0) > 0 && (
          <PrintSection title="Checklist Pré-Operatória">
            <table className="w-full text-xs border-collapse border border-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border border-gray-300 px-2 py-1 text-left">Item</th>
                  <th className="border border-gray-300 px-2 py-1 text-center w-20">Estado</th>
                  <th className="border border-gray-300 px-2 py-1 text-left">Notas</th>
                </tr>
              </thead>
              <tbody>
                {protocol.checklist!.map((item, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="border border-gray-300 px-2 py-1">{item.item}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center font-semibold">{checkStatusLabel[item.status] ?? item.status}</td>
                    <td className="border border-gray-300 px-2 py-1 text-gray-600">{item.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PrintSection>
        )}

        {sel.plan && protocol.surgicalPlan && <SurgicalPlanPrint plan={protocol.surgicalPlan} />}

        {sel.plan && (protocol.surgicalPlan as any)?.nasalNotes && (
          <div className="mb-8 border border-amber-400 bg-amber-50 p-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-amber-800 mb-2">Parte Nasal</h2>
            <div className="text-sm whitespace-pre-wrap">{(protocol.surgicalPlan as any).nasalNotes}</div>
          </div>
        )}

        {sel.sequence && (protocol.surgicalSequence?.length ?? 0) > 0 && (
          <PrintSection title="Sequência Cirúrgica">
            <ol className="text-sm list-none space-y-1">
              {[...protocol.surgicalSequence!].sort((a, b) => a.order - b.order).map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="font-mono text-gray-500 w-6 text-right shrink-0">{step.order}.</span>
                  <span>
                    {step.description}
                    {(step.startTime || step.endTime) && (
                      <span className="text-gray-500 ml-2 text-xs">({step.startTime || "--:--"} – {step.endTime || "--:--"})</span>
                    )}
                    {step.notes && <span className="text-gray-600 ml-2 text-xs italic">{step.notes}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </PrintSection>
        )}

        {operativeReportBlock}

        {sel.intraop && protocol.intraopRecord && (
          <div className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest bg-gray-100 p-2 mb-4 border-l-4 border-primary">Registo Intra-operatório</h2>
            <div className="grid grid-cols-2 gap-4 text-sm border p-4">
              <div>
                <span className="font-semibold text-gray-600 block mb-1">Anestesia</span>
                Início: {protocol.intraopRecord.anesthesiaStartTime || "--:--"} <br />
                Fim: {protocol.intraopRecord.anesthesiaEndTime || "--:--"}
              </div>
              <div>
                <span className="font-semibold text-gray-600 block mb-1">Cirurgia</span>
                Início: {protocol.intraopRecord.surgeryStartTime || "--:--"} <br />
                Fim: {protocol.intraopRecord.surgeryEndTime || "--:--"}
              </div>
            </div>

            {protocol.intraopRecord.complications && protocol.intraopRecord.complications.length > 0 && (
              <div className="mt-4 text-sm border border-red-200 p-4 bg-red-50">
                <span className="font-bold text-red-800 block mb-2">Complicações Intra-operatórias</span>
                <ul className="list-disc list-inside pl-4 text-red-900">
                  {protocol.intraopRecord.complications.map((comp, idx) => (
                    <li key={idx}>
                      {comp.description}
                      {comp.action && <span className="text-gray-600 ml-2">(Ação: {comp.action})</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {sel.materials && protocol.materials && (plates.length > 0 || drills.length > 0 || saws.length > 0) && (
          <OsteosynthesisPrint plates={plates} drills={drills} saws={saws} />
        )}

        {sel.planningImages && pdfImages.length > 0 && (
          <PrintSection title="Planeamento Virtual 3D">
            <div className="grid grid-cols-3 gap-4">
              {pdfImages.map(img => (
                <div key={img.id} className="border border-gray-200">
                  <img
                    src={img.servingUrl}
                    alt={img.caption || img.originalName || "Imagem"}
                    className="w-full h-36 object-cover"
                  />
                  <div className="p-2">
                    {img.caption && (
                      <p className="text-xs text-gray-700 leading-snug">{img.caption}</p>
                    )}
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">
                      {img.category.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </PrintSection>
        )}

        {sel.clinicalPhotos && clinicalPhotos.length > 0 && (
          <PrintSection title="Documentação Fotográfica Clínica">
            <div className="grid grid-cols-3 gap-4">
              {clinicalPhotos.map(img => (
                <div key={img.id} className="border border-gray-200">
                  <img
                    src={img.servingUrl}
                    alt={img.caption || img.originalName || "Fotografia"}
                    className="w-full h-36 object-cover"
                  />
                  <div className="p-2">
                    {img.caption && <p className="text-xs text-gray-700 leading-snug">{img.caption}</p>}
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">
                      {CLINICAL_PHOTO_LABELS[img.category] || img.category}
                      {img.captureDate ? ` • ${format(new Date(img.captureDate), "dd/MM/yyyy")}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </PrintSection>
        )}

        {sel.files3d && pdfFiles3d.length > 0 && (
          <PrintSection title="Inventário de Ficheiros 3D">
            <table className="w-full text-xs border-collapse border border-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border border-gray-300 px-2 py-1 text-left">Ficheiro</th>
                  <th className="border border-gray-300 px-2 py-1 text-left">Tipo</th>
                  <th className="border border-gray-300 px-2 py-1 text-center">Formato</th>
                  <th className="border border-gray-300 px-2 py-1 text-left">Origem</th>
                  <th className="border border-gray-300 px-2 py-1 text-center">Data</th>
                  <th className="border border-gray-300 px-2 py-1 text-center">Versão</th>
                </tr>
              </thead>
              <tbody>
                {pdfFiles3d.map((f, i) => (
                  <tr key={f.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="border border-gray-300 px-2 py-1">{f.originalName || "—"}</td>
                    <td className="border border-gray-300 px-2 py-1">{FILE_3D_TYPE_LABELS[f.fileType] || f.fileType}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center uppercase font-mono">{f.fileFormat}</td>
                    <td className="border border-gray-300 px-2 py-1 text-gray-700">{f.origin || "—"}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{f.fileDate ? format(new Date(f.fileDate), "dd/MM/yyyy") : "—"}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{f.version || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PrintSection>
        )}

        {sel.diagrams && printedDiagrams.length > 0 && (
          <PrintSection title="Diagramas Cirúrgicos — Osteotomias &amp; Marcações">
            <div className="flex flex-wrap gap-6 justify-center">
              {printedDiagrams.map((d) => (
                <SurgicalDiagramStatic key={d.id} diagramId={d.id} value={diagrams![d.id]!} width={240} />
              ))}
            </div>
          </PrintSection>
        )}

        {sel.piezo && piezoUsed && (
          <PrintSection title="Equipamento Piezoelétrico">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm border p-4">
              <div><span className="font-semibold text-gray-600">Sistema:</span> {piezo!.brand === "wh" ? "W&H (Piezomed)" : piezo!.brand === "mectron" ? "Mectron (Piezosurgery)" : "Outro fabricante"}</div>
              <div><span className="font-semibold text-gray-600">Modelo:</span> {piezo!.model || "—"}</div>
              <div><span className="font-semibold text-gray-600">Ponta / Inserto:</span> {piezo!.tip || "—"}</div>
              <div><span className="font-semibold text-gray-600">Nº de Série:</span> {piezo!.serial || "—"}</div>
              {piezo!.notes && <div className="col-span-2"><span className="font-semibold text-gray-600">Observações:</span> {piezo!.notes}</div>}
            </div>
          </PrintSection>
        )}

        {recommendationsBlock}
        {homeMedicationBlock}
        {nextAppointmentBlock}
        {summaryBlock}

        {sel.internalNotes && protocol.postopNotes && (
          <PrintSection title="Instruções / Notas Pós-Operatórias (Internas)">
            <div className="text-sm leading-relaxed whitespace-pre-wrap font-serif">
              {protocol.postopNotes}
            </div>
          </PrintSection>
        )}

        {/* Footer DEMO banner */}
        {isDemo && (
          <div className="mt-8 p-3 border-2 border-red-300 bg-red-50 text-center">
            <div className="text-sm font-bold text-red-700 uppercase tracking-widest">
              ⚠ DEMONSTRAÇÃO — DADOS FICTÍCIOS — NÃO CLÍNICO ⚠
            </div>
          </div>
        )}

        {/* Reopen audit trail — só nas observações internas dos documentos internos */}
        {!isNota && sel.internalNotes && (protocol.reopenHistory?.length ?? 0) > 0 && (
          <div className="mt-8 pt-3 border-t border-gray-300 text-[10px] text-gray-500">
            <span className="font-semibold uppercase tracking-widest">Histórico de reaberturas: </span>
            {protocol.reopenHistory!.map((ev, i) => (
              <span key={i}>
                {i > 0 && "; "}
                {new Date(ev.reopenedAt).toLocaleString("pt-PT")}
                {ev.reopenedBy ? ` (${ev.reopenedBy})` : ""}
              </span>
            ))}
          </div>
        )}

        {/* Assinaturas */}
        {isNota || isRelatorio ? (
          <SurgeonSignature />
        ) : (
          <div className="mt-24 pt-8 border-t border-gray-300 flex justify-between px-12">
            <div className="text-center w-48">
              <div className="border-b border-black mb-2 h-16"></div>
              <div className="text-xs uppercase font-bold text-gray-500">O Cirurgião</div>
            </div>
            <div className="text-center w-48">
              <div className="border-b border-black mb-2 h-16"></div>
              <div className="text-xs uppercase font-bold text-gray-500">O Anestesista</div>
            </div>
          </div>
        )}

        <ClinicFooter legal={isNota} />

      </div>
      )}

      {/* Print styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { margin: 15mm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
          #print-document { max-width: 100%; width: 100%; }
        }
      `}} />
    </div>
  );
}
