import { db, phrasesTable, templatesTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { logger } from "./logger";

// ─── Frases Clínicas pré-carregadas ─────────────────────────────────────────
// Seed idempotente: insere apenas frases (isCustom=false) que ainda não
// existam com o mesmo texto. Nunca apaga frases personalizadas.
const SEED_PHRASES: Array<{ category: string; subcategory?: string; text: string }> = [
  // Cirurgia
  { category: "Cirurgia", text: "Sob anestesia geral, procedemos a:" },
  { category: "Cirurgia", subcategory: "Maxila", text: "Osteotomia de LeFort I para reposicionamento tridimensional do maxilar superior. O maxilar foi fixado com placas e parafusos de titânio." },
  { category: "Cirurgia", subcategory: "Maxila", text: "Osteotomia de LeFort I com segmentação em 2 partes por distal dos laterais, para reposicionamento tridimensional do maxilar superior. O maxilar foi fixado com placas e parafusos de titânio." },
  { category: "Cirurgia", subcategory: "Maxila", text: "Osteotomia de LeFort I com segmentação em 3 partes por distal dos laterais, para reposicionamento tridimensional do maxilar superior. O maxilar foi fixado com placas e parafusos de titânio." },
  { category: "Cirurgia", subcategory: "Maxila", text: "Osteotomia de LeFort I com segmentação em 4 partes por distal dos laterais, para reposicionamento tridimensional do maxilar superior. O maxilar foi fixado com placas e parafusos de titânio." },
  { category: "Cirurgia", subcategory: "Mandíbula", text: "Osteotomias sagitais dos ramos ascendentes da mandíbula com preservação do pedículo vásculo-nervoso. Fixação rígida bilateral com uma placa de BSSO e 4 parafusos." },
  { category: "Cirurgia", subcategory: "Mento", text: "Mentoplastia de avanço. Fixação com placa de titânio especial de mento e 4 parafusos." },
  { category: "Cirurgia", subcategory: "Mento", text: "Mentoplastia de avanço. Fixação com duas placas de titânio lateralizadas por défice de altura central." },
  { category: "Cirurgia", subcategory: "Nasal", text: "Septoplastia simultânea por desvio e remoção de mucocelos dos seios maxilares." },
  { category: "Cirurgia", text: "Suturas com pontos reabsorvíveis." },
  { category: "Cirurgia", text: "Intervenção cirúrgica de elevada dificuldade técnica." },
  // Pós-operatório
  { category: "Pós-operatório", text: "A intervenção e o período pós-operatório decorreram sem complicações." },
  { category: "Pós-operatório", text: "Foi reinstituída precocemente a terapêutica ortodôntica." },
  { category: "Pós-operatório", text: "Iniciou a tracção elástica no pós-operatório imediato e deve mantê-la até melhoria da mordida." },
  // Medicação
  { category: "Medicação", text: "Foi medicado com antibióticos, anti-inflamatórios esteróides e não esteróides, analgésicos e aplicação de frio local." },
  { category: "Medicação", text: "Foi medicado com antibióticos, anti-inflamatórios esteróides e não esteróides, analgésicos, protetor gástrico e aplicação de frio local." },
  { category: "Medicação", text: "Foi medicado com antibióticos, anti-inflamatórios esteróides e não esteróides, analgésicos, descongestionante nasal e aplicação de frio local." },
  { category: "Medicação", text: "Foi medicado com antibióticos, anti-inflamatórios esteróides e não esteróides, analgésicos e aplicação de frio local com Hiloterm." },
  // Recomendações
  { category: "Recomendações", text: "Foi fornecido ao doente orientação pós-operatória terapêutica e alimentar." },
];

async function seedPhrases(): Promise<void> {
  let inserted = 0;
  for (const phrase of SEED_PHRASES) {
    const existing = await db
      .select({ id: phrasesTable.id })
      .from(phrasesTable)
      .where(and(eq(phrasesTable.text, phrase.text), eq(phrasesTable.isCustom, false)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(phrasesTable).values({
        category: phrase.category,
        subcategory: phrase.subcategory ?? "",
        text: phrase.text,
        isCustom: false,
      });
      inserted++;
    }
  }
  if (inserted > 0) logger.info({ inserted }, "Frases clínicas pré-carregadas");
}

// ─── Limpeza de templates ────────────────────────────────────────────────────
// Remove "Reserva de Sangue" das checklists dos templates e o SARPE do tipo de
// osteotomia da maxila nos templates. NÃO altera protocolos existentes.
async function cleanTemplates(): Promise<void> {
  const templates = await db.select().from(templatesTable);
  for (const tpl of templates) {
    let changed = false;
    let checklist = tpl.checklist as Array<{ item?: string }> | null;
    if (Array.isArray(checklist)) {
      const filtered = checklist.filter(
        (c) => !(c.item || "").toLowerCase().includes("reserva de sangue"),
      );
      if (filtered.length !== checklist.length) {
        checklist = filtered;
        changed = true;
      }
    }
    let plan = tpl.surgicalPlan as { maxilla?: { osteotomyType?: string } } | null;
    if (plan?.maxilla?.osteotomyType === "SARPE") {
      plan = { ...plan, maxilla: { ...plan.maxilla, osteotomyType: "LeFort_I" } };
      changed = true;
    }
    if (changed) {
      await db
        .update(templatesTable)
        .set({ checklist, surgicalPlan: plan })
        .where(eq(templatesTable.id, tpl.id));
      logger.info({ templateId: tpl.id, name: tpl.name }, "Template atualizado (Reserva de Sangue / SARPE removidos)");
    }
  }
}

export async function runSeed(): Promise<void> {
  try {
    await seedPhrases();
    await cleanTemplates();
  } catch (err) {
    logger.error({ err }, "Erro no seed inicial — a aplicação continua");
  }
}
