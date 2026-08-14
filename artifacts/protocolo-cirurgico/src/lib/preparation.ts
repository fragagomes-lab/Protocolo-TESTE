// ── Fase de Preparação — catálogo de itens, aplicabilidade e prazos ─────────
// Estruturado como a primeira fase de uma futura linha temporal
// (Preparação → Cirurgia Virtual → Cirurgia → Pós-operatório).

import type { Preparation, PrepItem, PrepProduct } from "@workspace/api-client-react";

export type Appliance = "brk" | "aligners";
export type Segmentation = "yes" | "no" | "undecided";

export const APPLIANCE_LABELS: Record<Appliance, string> = {
  brk: "BRK (aparelho fixo)",
  aligners: "Aligners (alinhadores)",
};

export const SEGMENTATION_LABELS: Record<Segmentation, string> = {
  yes: "Sim",
  no: "Não",
  undecided: "Por decidir",
};

export interface PrepItemDef {
  key: string;
  label: string;
  note?: string;
  hasDetail?: boolean; // campo de texto associado (ex.: tipo de aparelho auxiliar)
  // aplicabilidade ao percurso; ausente = sempre aplicável
  applicableWhen?: (ctx: PrepContext) => boolean;
}

export interface PrepBlockDef {
  key: string;
  title: string;
  items: PrepItemDef[];
}

export interface PrepContext {
  appliance: Appliance | null;
  segmentation: Segmentation;
  decisions: NonNullable<Preparation["decisions"]>;
}

const onlyBrk = (ctx: PrepContext) => ctx.appliance === "brk";

export const PREP_BLOCKS: PrepBlockDef[] = [
  {
    key: "orto",
    title: "Ortodontista",
    items: [
      { key: "orto.brackets", label: "Colocar brackets", applicableWhen: onlyBrk },
      { key: "orto.bandas", label: "Cimentar bandas", applicableWhen: onlyBrk },
      { key: "orto.aparelho_auxiliar", label: "Aparelho auxiliar", hasDetail: true },
      { key: "orto.kobayashis", label: "Kobayashis / ganchos" },
    ],
  },
  {
    key: "doc",
    title: "Documentação",
    items: [
      { key: "doc.questionario", label: "Questionário médico" },
      { key: "doc.analises", label: "Análises – ECG – Tórax", note: "tórax e ECG nem sempre necessários" },
      { key: "doc.instrucoes", label: "Instruções pré e pós-operatórias entregues ao doente" },
      { key: "doc.medicacao", label: "Medicação" },
      { key: "doc.tac_requisicao", label: "Entregar requisição da TAC CF / instruções da TAC / cera" },
      { key: "doc.consentimentos", label: "Consentimento informado hospitalar e da Clínica da Face" },
      { key: "doc.relatorio", label: "Relatório clínico" },
    ],
  },
  {
    key: "fotos",
    title: "Fotos Clínicas",
    items: [
      { key: "fotos.rotina", label: "Faciais / dentárias de rotina" },
      { key: "fotos.closeup", label: "Close up — relação lábio-dente em repouso e sorriso" },
      { key: "fotos.axiais", label: "Axiais (assimetrias)" },
      { key: "fotos.abrebocas", label: "Frente com abre-bocas" },
      { key: "fotos.calibracao", label: "Faciais para calibração (frente repouso + sorriso; perfil)" },
    ],
  },
  {
    key: "imagio",
    title: "Imagiologia",
    items: [
      { key: "imagio.tac_cf", label: "TAC craniofacial completa com protocolo" },
      { key: "imagio.opg", label: "Ortopantomografia", note: "restantes radiografias efetuam-se a partir da TAC" },
      { key: "imagio.cera_mordida", label: "Cera de mordida em relação cêntrica para efetuar a TAC ou CBCT" },
    ],
  },
  {
    key: "cv3d",
    title: "Cirurgia Virtual 3D",
    items: [
      { key: "cv3d.scan_periferia", label: "Scanning intraoral das arcadas c/ periferia (10–15 mm) do palato" },
      { key: "cv3d.scan_palato", label: "Scanning intraoral das arcadas c/ todo o palato" },
      { key: "cv3d.modelos", label: "Modelo superior / inferior — identificados" },
      { key: "cv3d.arcadas_limpas", label: "Preparação de arcadas limpas" },
      { key: "cv3d.tac_limpa", label: "TAC CF limpa" },
    ],
  },
];

// Alertas condicionais do percurso (ponto 5)
export const PREP_ALERTS = [
  {
    key: "arco_continuo",
    label: "URGENTE — Instalar arco contínuo na arcada segmentada",
    activeWhen: (ctx: PrepContext) => ctx.appliance === "brk" && ctx.segmentation === "yes",
  },
  {
    key: "clincheck",
    label: "Confirmar planeamento do ClinCheck pós-operatório (risco de atraso)",
    activeWhen: (ctx: PrepContext) => ctx.appliance === "aligners",
  },
] as const;

// Produtos a fabricar (ponto 6)
export interface PrepProductDef {
  key: string;
  label: string;
  applicableWhen?: (ctx: PrepContext) => boolean;
}

export const PREP_PRODUCTS: PrepProductDef[] = [
  { key: "modelo_fisico", label: "Modelo físico impresso" },
  {
    key: "alinhador_transicao",
    label: "Alinhador de transição",
    applicableWhen: (ctx) => ctx.appliance === "aligners" && ctx.segmentation === "yes",
  },
  { key: "placa_contencao", label: "Placa de contenção palatina" },
  {
    key: "guias_cirurgicas",
    label: "Guias cirúrgicas",
    applicableWhen: (ctx) => ctx.decisions?.guides !== "splintless",
  },
];

export const PRODUCT_STATUS_LABELS: Record<string, string> = {
  todo: "A fazer",
  in_production: "Em produção",
  printed: "Impresso",
  verified: "Verificado",
  na_auto: "N/A (percurso)",
};

export const PRODUCT_STATUS_ORDER = ["todo", "in_production", "printed", "verified"] as const;

export const ITEM_STATUS_LABELS: Record<string, string> = {
  todo: "Por fazer",
  done: "Feito",
  na: "N/A",
  na_auto: "N/A (percurso)",
};

// URL da app de Instruções Operatórias (ponto 7). O URL não aceita parâmetros
// de personalização documentados — usa-se o link simples.
export const INSTRUCTIONS_APP_URL = "https://oral-care-instructions-clinica-da-face.replit.app";

export function buildPrepContext(
  appliance: string | null | undefined,
  preparation: Preparation | null | undefined,
): PrepContext {
  return {
    appliance: appliance === "brk" || appliance === "aligners" ? appliance : null,
    segmentation: (preparation?.segmentation as Segmentation) || "undecided",
    decisions: preparation?.decisions || {},
  };
}

export function isItemApplicable(def: PrepItemDef, ctx: PrepContext): boolean {
  return def.applicableWhen ? def.applicableWhen(ctx) : true;
}

export function isProductApplicable(def: PrepProductDef, ctx: PrepContext): boolean {
  return def.applicableWhen ? def.applicableWhen(ctx) : true;
}

// Estado efetivo de um item: estados manuais (todo/done/na) persistem sempre;
// "na_auto" é DERIVADO do percurso — se a regra voltar a tornar o item
// aplicável, um "na_auto" gravado é ignorado e o item regressa a "todo",
// para nunca ocultar uma pendência clínica.
export function effectiveItemStatus(
  def: PrepItemDef,
  ctx: PrepContext,
  stored: PrepItem | undefined,
): string {
  if (stored?.status && stored.status !== "na_auto") return stored.status;
  return isItemApplicable(def, ctx) ? "todo" : "na_auto";
}

export function effectiveProductStatus(
  def: PrepProductDef,
  ctx: PrepContext,
  stored: PrepProduct | undefined,
): string {
  if (stored?.status && stored.status !== "na_auto") return stored.status;
  return isProductApplicable(def, ctx) ? "todo" : "na_auto";
}

const DAY_MS = 24 * 60 * 60 * 1000;

function parseIsoDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s.length <= 10 ? `${s}T00:00:00` : s);
  return isNaN(d.getTime()) ? null : d;
}

// Data-limite da última ativação: 3 semanas antes (BRK) / 2 semanas (Aligners).
// Ajustável caso a caso (override manual persistido em preparation).
export function computeActivationDeadline(
  surgeryDate: string | null | undefined,
  appliance: Appliance | null,
  preparation: Preparation | null | undefined,
): { deadline: string | null; manual: boolean } {
  if (preparation?.activationDeadlineManual && preparation?.activationDeadline) {
    return { deadline: preparation.activationDeadline.slice(0, 10), manual: true };
  }
  const surgery = parseIsoDate(surgeryDate);
  if (!surgery || !appliance) {
    return { deadline: preparation?.activationDeadline?.slice(0, 10) || null, manual: false };
  }
  const weeks = appliance === "aligners" ? 2 : 3;
  const d = new Date(surgery.getTime() - weeks * 7 * DAY_MS);
  return { deadline: d.toISOString().slice(0, 10), manual: false };
}

export function deadlineState(deadline: string | null, lastActivationDone: boolean): "ok" | "near" | "overdue" | null {
  if (!deadline || lastActivationDone) return lastActivationDone ? "ok" : null;
  const d = parseIsoDate(deadline);
  if (!d) return null;
  const now = Date.now();
  // O dia da data-limite ainda conta — só fica "ultrapassada" depois do fim
  // desse dia civil.
  const endOfDeadlineDay = d.getTime() + DAY_MS;
  if (now >= endOfDeadlineDay) return "overdue";
  if (endOfDeadlineDay - now <= 8 * DAY_MS) return "near";
  return "ok";
}

// ── Traduções fixas (EN-GB/ES) do catálogo da Preparação, para o documento
// impresso. A UI da app mantém-se em português.
export const PREP_I18N: Record<string, { en: string; es: string }> = {
  // Blocos
  "block.orto": { en: "Orthodontist", es: "Ortodoncista" },
  "block.doc": { en: "Documentation", es: "Documentación" },
  "block.fotos": { en: "Clinical Photographs", es: "Fotos Clínicas" },
  "block.imagio": { en: "Imaging", es: "Imagenología" },
  "block.cv3d": { en: "3D Virtual Surgery", es: "Cirugía Virtual 3D" },
  // Itens
  "orto.brackets": { en: "Place brackets", es: "Colocar brackets" },
  "orto.bandas": { en: "Cement bands", es: "Cementar bandas" },
  "orto.aparelho_auxiliar": { en: "Auxiliary appliance", es: "Aparato auxiliar" },
  "orto.kobayashis": { en: "Kobayashis / hooks", es: "Kobayashis / ganchos" },
  "doc.questionario": { en: "Medical questionnaire", es: "Cuestionario médico" },
  "doc.analises": { en: "Blood tests – ECG – Chest X-ray", es: "Análisis – ECG – Tórax" },
  "doc.instrucoes": { en: "Pre- and post-operative instructions given to the patient", es: "Instrucciones pre y postoperatorias entregadas al paciente" },
  "doc.medicacao": { en: "Medication", es: "Medicación" },
  "doc.tac_requisicao": { en: "Provide craniofacial CT request / CT instructions / wax", es: "Entregar solicitud de TAC CF / instrucciones de la TAC / cera" },
  "doc.consentimentos": { en: "Hospital and Clínica da Face informed consent", es: "Consentimiento informado hospitalario y de la Clínica da Face" },
  "doc.relatorio": { en: "Clinical report", es: "Informe clínico" },
  "fotos.rotina": { en: "Routine facial / dental photographs", es: "Faciales / dentales de rutina" },
  "fotos.closeup": { en: "Close-up — lip-tooth relationship at rest and smiling", es: "Close up — relación labio-diente en reposo y sonrisa" },
  "fotos.axiais": { en: "Axial views (asymmetries)", es: "Axiales (asimetrías)" },
  "fotos.abrebocas": { en: "Frontal with cheek retractor", es: "Frente con abrebocas" },
  "fotos.calibracao": { en: "Facial photographs for calibration (frontal at rest + smiling; profile)", es: "Faciales para calibración (frente en reposo + sonrisa; perfil)" },
  "imagio.tac_cf": { en: "Full craniofacial CT with protocol", es: "TAC craneofacial completa con protocolo" },
  "imagio.opg": { en: "Orthopantomogram", es: "Ortopantomografía" },
  "imagio.cera_mordida": { en: "Bite wax in centric relation for the CT or CBCT", es: "Cera de mordida en relación céntrica para la TAC o CBCT" },
  "cv3d.scan_periferia": { en: "Intraoral scan of the arches incl. palate periphery (10–15 mm)", es: "Escaneado intraoral de las arcadas con periferia (10–15 mm) del paladar" },
  "cv3d.scan_palato": { en: "Intraoral scan of the arches incl. full palate", es: "Escaneado intraoral de las arcadas con todo el paladar" },
  "cv3d.modelos": { en: "Upper / lower models — identified", es: "Modelo superior / inferior — identificados" },
  "cv3d.arcadas_limpas": { en: "Preparation of clean arches", es: "Preparación de arcadas limpias" },
  "cv3d.tac_limpa": { en: "Clean craniofacial CT", es: "TAC CF limpia" },
  // Produtos
  "prod.modelo_fisico": { en: "Printed physical model", es: "Modelo físico impreso" },
  "prod.alinhador_transicao": { en: "Transition aligner", es: "Alineador de transición" },
  "prod.placa_contencao": { en: "Palatal retention plate", es: "Placa de contención palatina" },
  "prod.guias_cirurgicas": { en: "Surgical guides", es: "Guías quirúrgicas" },
  // Aparelho / segmentação
  "appliance.brk": { en: "BRK (fixed appliance)", es: "BRK (aparato fijo)" },
  "appliance.aligners": { en: "Aligners", es: "Aligners (alineadores)" },
  "seg.yes": { en: "Yes", es: "Sí" },
  "seg.no": { en: "No", es: "No" },
  "seg.undecided": { en: "To be decided", es: "Por decidir" },
};

// Etiqueta traduzida do catálogo da Preparação para o documento impresso;
// em PT (ou sem tradução) devolve o fallback.
export function prepI18n(key: string, lang: string, fallbackPt: string): string {
  if (lang === "en" || lang === "es") return PREP_I18N[key]?.[lang] ?? fallbackPt;
  return fallbackPt;
}
