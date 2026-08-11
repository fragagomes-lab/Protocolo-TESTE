import { useGetProtocol, useListPlanningImages, useListFiles3d, getListFiles3dQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { format } from "date-fns";
import logo from "@assets/clinicadaface-logo.gif";
import { Printer, ChevronLeft, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChecklistItemStatus, PlateRecord, ScrewRecord, DrillRecord, SawRecord, SurgicalPlan, OrthoMovements } from "@workspace/api-client-react";
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
            ) : (
              <MovementsRow segment="Maxila" movements={maxilla.segments?.[0]?.movements} />
            ))}
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

  return (
    <div className="min-h-screen bg-white">
      {/* Print Controls - Hidden during print */}
      <div className="print:hidden bg-sidebar p-4 flex justify-between items-center sticky top-0 z-10 shadow-md">
        <Button variant="ghost" asChild className="text-white hover:text-white/80 hover:bg-white/10 uppercase tracking-widest rounded-sm">
          <Link href={`/protocols/${id}`}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Voltar ao Editor
          </Link>
        </Button>
        <Button onClick={handlePrint} className="bg-white text-sidebar hover:bg-white/90 uppercase tracking-widest rounded-sm">
          <Printer className="mr-2 h-4 w-4" /> Imprimir / PDF
        </Button>
      </div>

      {/* Print Document */}
      <div className="max-w-[210mm] mx-auto bg-white p-12 text-black print:p-0 print:m-0" id="print-document">

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

        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
          <div>
            <img src={logo} alt="Clínica da Face" className="h-16 object-contain" />
            <div className="mt-2 text-xs text-gray-500 font-serif">Cirurgia Maxilofacial &bull; Implantologia &bull; Ortodontia</div>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold uppercase tracking-widest text-primary">Protocolo Operatório</h1>
            <div className="text-sm mt-1 text-gray-600">Proc. Nº {protocol.processNumber}</div>
            <div className="text-sm mt-1">Data: {protocol.surgeryDate ? format(new Date(protocol.surgeryDate), "dd/MM/yyyy") : "___/___/_____"}</div>
            {isDemo && (
              <div className="mt-1 text-xs font-bold text-red-600 uppercase tracking-widest">⚠ DEMONSTRAÇÃO</div>
            )}
          </div>
        </div>

        {/* Section: Identificação */}
        <div className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-widest bg-gray-100 p-2 mb-4 border-l-4 border-primary">Identificação do Doente</h2>
          <div className="flex gap-4 items-start">
            {headerPhoto && (
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
              <div className="col-span-2"><span className="font-semibold text-gray-600">Procedimento:</span> <span className="font-bold">{protocol.surgeryType}</span></div>
            </div>
          </div>
        </div>

        {/* Section: Avisos Importantes */}
        {protocol.preopDiagnosis && (protocol.preopDiagnosis as any).clinicalAlerts && (
          <div className="mb-8 border-2 border-red-500 bg-red-50 p-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-red-700 mb-2">⚠ Avisos Importantes</h2>
            <div className="text-sm font-semibold text-red-900 whitespace-pre-wrap">
              {(protocol.preopDiagnosis as any).clinicalAlerts}
            </div>
          </div>
        )}

        {/* Section: Equipa */}
        <div className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-widest bg-gray-100 p-2 mb-4 border-l-4 border-primary">Equipa Cirúrgica</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div><span className="font-semibold text-gray-600">Cirurgião:</span> {protocol.team?.surgeon || "-"}</div>
            <div><span className="font-semibold text-gray-600">Anestesista:</span> {protocol.team?.anesthesiologist || "-"}</div>
            <div><span className="font-semibold text-gray-600">1º Ajudante:</span> {protocol.team?.firstAssistant || "-"}</div>
            <div><span className="font-semibold text-gray-600">Instrumentista:</span> {protocol.team?.instrumentist || "-"}</div>
            <div><span className="font-semibold text-gray-600">2º Ajudante:</span> {protocol.team?.secondAssistant || "-"}</div>
            <div><span className="font-semibold text-gray-600">Circulante:</span> {protocol.team?.scrubNurse || "-"}</div>
          </div>
        </div>

        {/* Section: Plano Cirúrgico */}
        {protocol.surgicalPlan && <SurgicalPlanPrint plan={protocol.surgicalPlan} />}

        {/* Section: Parte Nasal */}
        {protocol.surgicalPlan && (protocol.surgicalPlan as any).nasalNotes && (
          <div className="mb-8 border border-amber-400 bg-amber-50 p-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-amber-800 mb-2">Parte Nasal</h2>
            <div className="text-sm whitespace-pre-wrap">{(protocol.surgicalPlan as any).nasalNotes}</div>
          </div>
        )}

        {/* Section: Descritivo */}
        <div className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-widest bg-gray-100 p-2 mb-4 border-l-4 border-primary">Descritivo Operatório</h2>
          <div className="text-sm leading-relaxed whitespace-pre-wrap font-serif text-justify">
            {protocol.operativeDescription || "Nenhum descritivo operatório registado."}
          </div>
        </div>

        {/* Section: Tabela de Tempos */}
        {protocol.intraopRecord && (
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

        {/* Section: Materiais de Osteossíntese — enriched */}
        {protocol.materials && (plates.length > 0 || drills.length > 0 || saws.length > 0) && (
          <OsteosynthesisPrint plates={plates} drills={drills} saws={saws} />
        )}

        {/* Section: Planeamento Virtual 3D */}
        {pdfImages.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest bg-gray-100 p-2 mb-4 border-l-4 border-primary">Planeamento Virtual 3D</h2>
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
          </div>
        )}

        {/* Section: Fotografia Clínica */}
        {clinicalPhotos.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest bg-gray-100 p-2 mb-4 border-l-4 border-primary">Documentação Fotográfica Clínica</h2>
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
          </div>
        )}

        {/* Section: Inventário de Ficheiros 3D */}
        {pdfFiles3d.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest bg-gray-100 p-2 mb-4 border-l-4 border-primary">Inventário de Ficheiros 3D</h2>
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
          </div>
        )}

        {/* Section: Diagramas Cirúrgicos */}
        {printedDiagrams.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest bg-gray-100 p-2 mb-4 border-l-4 border-primary">Diagramas Cirúrgicos — Osteotomias &amp; Marcações</h2>
            <div className="flex flex-wrap gap-6 justify-center">
              {printedDiagrams.map((d) => (
                <SurgicalDiagramStatic key={d.id} diagramId={d.id} value={diagrams![d.id]!} width={240} />
              ))}
            </div>
          </div>
        )}

        {/* Section: Equipamento Piezoelétrico */}
        {piezoUsed && (
          <div className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest bg-gray-100 p-2 mb-4 border-l-4 border-primary">Equipamento Piezoelétrico</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm border p-4">
              <div><span className="font-semibold text-gray-600">Sistema:</span> {piezo!.brand === "wh" ? "W&H (Piezomed)" : piezo!.brand === "mectron" ? "Mectron (Piezosurgery)" : "Outro fabricante"}</div>
              <div><span className="font-semibold text-gray-600">Modelo:</span> {piezo!.model || "—"}</div>
              <div><span className="font-semibold text-gray-600">Ponta / Inserto:</span> {piezo!.tip || "—"}</div>
              <div><span className="font-semibold text-gray-600">Nº de Série:</span> {piezo!.serial || "—"}</div>
              {piezo!.notes && <div className="col-span-2"><span className="font-semibold text-gray-600">Observações:</span> {piezo!.notes}</div>}
            </div>
          </div>
        )}

        {/* Section: Notas Pós-op */}
        {protocol.postopNotes && (
          <div className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest bg-gray-100 p-2 mb-4 border-l-4 border-primary">Instruções / Notas Pós-Operatórias</h2>
            <div className="text-sm leading-relaxed whitespace-pre-wrap font-serif">
              {protocol.postopNotes}
            </div>
          </div>
        )}

        {/* Footer DEMO banner */}
        {isDemo && (
          <div className="mt-8 p-3 border-2 border-red-300 bg-red-50 text-center">
            <div className="text-sm font-bold text-red-700 uppercase tracking-widest">
              ⚠ DEMONSTRAÇÃO — DADOS FICTÍCIOS — NÃO CLÍNICO ⚠
            </div>
          </div>
        )}

        {/* Reopen audit trail — a reopened report must disclose it in print */}
        {(protocol.reopenHistory?.length ?? 0) > 0 && (
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

        {/* Signatures */}
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

      </div>
      
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
