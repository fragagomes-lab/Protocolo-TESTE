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
  // Cirurgia — acrescentos (modelos de Relatório Clínico)
  { category: "Cirurgia", subcategory: "Enxertos", text: "Recolha, sem complicações, de enxerto ósseo da crista ilíaca. Sutura por planos e intradérmica. Colocação de dreno aspirativo." },
  { category: "Cirurgia", subcategory: "Enxertos", text: "Adaptação e fixação dos enxertos ósseos com parafusos. Preenchimento e moldagem volumétrica com osso moído." },
  { category: "Cirurgia", subcategory: "Mandíbula", text: "Aplicação de guias de corte personalizadas na mandíbula." },
  { category: "Cirurgia", subcategory: "Mandíbula", text: "Remoção de saliências/extremidades ósseas da mandíbula." },
  // Pós-operatório — acrescentos
  { category: "Pós-operatório", text: "Foi colocado um sistema de arrefecimento facial com máscara (Hiloterm) no pós-operatório." },
  { category: "Pós-operatório", text: "Aplicação de injeção de córtico-esteróide para estimular a recuperação." },
  // Medicação para domicílio (dose e frequência editáveis após inserção)
  { category: "Medicação", subcategory: "Domicílio", text: "FORCID SOLUTAB 875/125 — dissolver e tomar de 8/8h nos 3 primeiros dias; depois 12/12h." },
  { category: "Medicação", subcategory: "Domicílio", text: "DEFLAZACORTE 6 mg — de 8/8h; é conveniente alimentar-se antes." },
  { category: "Medicação", subcategory: "Domicílio", text: "XUMADOL 1 g — saquetas, de 8/8h; suspender se não tiver dores." },
  { category: "Medicação", subcategory: "Domicílio", text: "METAMIZOL 575 mg — cápsulas, de 8/8h." },
  { category: "Medicação", subcategory: "Domicílio", text: "NIMESULIDE — saquetas; tomar até terminar a embalagem." },
  { category: "Medicação", subcategory: "Domicílio", text: "SUCRALFATO — saquetas; 2 antes do pequeno-almoço e 2 antes do jantar." },
  { category: "Medicação", subcategory: "Domicílio", text: "MALTOFER — líquido; 2/dia, ao almoço e jantar." },
  { category: "Medicação", subcategory: "Domicílio", text: "VIBROCIL — nebulizador; 2 nebulizações nas duas narinas, 3×/dia." },
  { category: "Medicação", subcategory: "Domicílio", text: "Esquema de analgesia: as tomas correspondem a intervalos de 8 horas para cada medicamento (riscar as tomas já efetuadas)." },
  // ─── Diagnóstico (construtor de frases) ────────────────────────────────────
  // Introduções — "Doente de [X] anos" seguido de:
  { category: "Diagnóstico", subcategory: "Introdução", text: "Doente de [X] anos com disfunção articular têmporo-mandibular que apresenta:" },
  { category: "Diagnóstico", subcategory: "Introdução", text: "Doente de [X] anos com discrepância dento-maxilar com mordida cruzada anterior que apresentava:" },
  { category: "Diagnóstico", subcategory: "Introdução", text: "Doente de [X] anos com disfunção respiratória noturna do sono, que apresenta:" },
  { category: "Diagnóstico", subcategory: "Introdução", text: "Doente de [X] anos com anomalia do crescimento dos maxilares que apresenta:" },
  { category: "Diagnóstico", subcategory: "Introdução", text: "Doente de [X] anos com disfunção respiratória do sono e disfunção têmporo-mandibular que apresenta:" },
  { category: "Diagnóstico", subcategory: "Introdução", text: "Doente de [X] anos que apresentava uma deformidade dentofacial caracterizada por:" },
  // Esquelético / sagital
  { category: "Diagnóstico", subcategory: "Esquelético / sagital", text: "Classe II esquelética." },
  { category: "Diagnóstico", subcategory: "Esquelético / sagital", text: "Classe II esquelética assimétrica." },
  { category: "Diagnóstico", subcategory: "Esquelético / sagital", text: "Classe II esquelética, com perfil convexo muito marcado." },
  { category: "Diagnóstico", subcategory: "Esquelético / sagital", text: "Classe III esquelética." },
  { category: "Diagnóstico", subcategory: "Esquelético / sagital", text: "Classe III esquelética assimétrica." },
  { category: "Diagnóstico", subcategory: "Esquelético / sagital", text: "Discrepância esquelética sagital com perfil côncavo." },
  { category: "Diagnóstico", subcategory: "Esquelético / sagital", text: "Discrepância esquelética sagital com perfil convexo." },
  { category: "Diagnóstico", subcategory: "Esquelético / sagital", text: "Retrusão do maxilar superior." },
  { category: "Diagnóstico", subcategory: "Esquelético / sagital", text: "Hipoplasia do maxilar superior." },
  { category: "Diagnóstico", subcategory: "Esquelético / sagital", text: "Retrusão mandibular." },
  { category: "Diagnóstico", subcategory: "Esquelético / sagital", text: "Protrusão mandibular." },
  { category: "Diagnóstico", subcategory: "Esquelético / sagital", text: "Biretrusão maxilo-mandibular." },
  { category: "Diagnóstico", subcategory: "Esquelético / sagital", text: "Discrepância esquelética sagital devida a excesso de crescimento sagital da mandíbula e retrusão do maxilar superior." },
  // Vertical / planos oclusais
  { category: "Diagnóstico", subcategory: "Vertical / planos oclusais", text: "Excesso vertical do maxilar superior." },
  { category: "Diagnóstico", subcategory: "Vertical / planos oclusais", text: "Défice vertical do maxilar superior." },
  { category: "Diagnóstico", subcategory: "Vertical / planos oclusais", text: "Mordida aberta anterior." },
  { category: "Diagnóstico", subcategory: "Vertical / planos oclusais", text: "Lábio superior curto." },
  { category: "Diagnóstico", subcategory: "Vertical / planos oclusais", text: "Plano oclusal superior em posição de rotação póstero-inferior." },
  { category: "Diagnóstico", subcategory: "Vertical / planos oclusais", text: "Plano oclusal superior duplo e divergente." },
  { category: "Diagnóstico", subcategory: "Vertical / planos oclusais", text: "Duplo plano oclusal superior." },
  { category: "Diagnóstico", subcategory: "Vertical / planos oclusais", text: "Alteração vertical do plano oclusal do maxilar superior no plano frontal (CANT), mais baixo à [D/E]." },
  { category: "Diagnóstico", subcategory: "Vertical / planos oclusais", text: "Mandíbula em posição de rotação póstero-inferior." },
  { category: "Diagnóstico", subcategory: "Vertical / planos oclusais", text: "Ângulo do plano oclusal superior muito acentuado em posição de rotação horária." },
  // Assimetrias
  { category: "Diagnóstico", subcategory: "Assimetrias", text: "Assimetria facial devida a hiperplasia condiliana idiopática." },
  { category: "Diagnóstico", subcategory: "Assimetrias", text: "Hiperplasia condiliana [D/E]." },
  { category: "Diagnóstico", subcategory: "Assimetrias", text: "Hipoplasia condiliana." },
  { category: "Diagnóstico", subcategory: "Assimetrias", text: "Acentuada hipoplasia condiliana e consequente micrognatismo." },
  { category: "Diagnóstico", subcategory: "Assimetrias", text: "Hipoplasia do ramo ascendente [D/E]." },
  { category: "Diagnóstico", subcategory: "Assimetrias", text: "Assimetria mandibular com desvio [D/E]." },
  { category: "Diagnóstico", subcategory: "Assimetrias", text: "Crescimento mandibular assimétrico." },
  { category: "Diagnóstico", subcategory: "Assimetrias", text: "Assimetria do maxilar com desvio e inclinação transversal." },
  { category: "Diagnóstico", subcategory: "Assimetrias", text: "Assimetria do mento." },
  { category: "Diagnóstico", subcategory: "Assimetrias", text: "Desvio da arcada dentária com inclinação (cant) do plano oclusal inferior." },
  { category: "Diagnóstico", subcategory: "Assimetrias", text: "Assimetria da forma e tamanho da arcada dentária mandibular." },
  // Transversal / dentário
  { category: "Diagnóstico", subcategory: "Transversal / dentário", text: "Discrepância dento-maxilar." },
  { category: "Diagnóstico", subcategory: "Transversal / dentário", text: "Discrepância transversal maxilo-mandibular." },
  { category: "Diagnóstico", subcategory: "Transversal / dentário", text: "Discrepância esquelética transversal maxilo-mandibular por insuficiência transversal do maxilar." },
  { category: "Diagnóstico", subcategory: "Transversal / dentário", text: "Discrepância esquelética transversal maxilo-mandibular com mordida cruzada latero-posterior." },
  { category: "Diagnóstico", subcategory: "Transversal / dentário", text: "Discrepância esquelética transversal maxilo-mandibular por défice maxilar." },
  { category: "Diagnóstico", subcategory: "Transversal / dentário", text: "Discrepância dento-maxilar com mordida cruzada anterior." },
  { category: "Diagnóstico", subcategory: "Transversal / dentário", text: "Oclusão de Classe II de Angle assimétrica." },
  { category: "Diagnóstico", subcategory: "Transversal / dentário", text: "Oclusão de Classe III de Angle assimétrica." },
  { category: "Diagnóstico", subcategory: "Transversal / dentário", text: "Reabsorções radiculares." },
  { category: "Diagnóstico", subcategory: "Transversal / dentário", text: "Extrusão do sector incisivo inferior." },
  { category: "Diagnóstico", subcategory: "Transversal / dentário", text: "Anomalias periodontais dos dentes incisivos inferiores." },
  { category: "Diagnóstico", subcategory: "Transversal / dentário", text: "Desarmonia oclusal com impossibilidade de mastigar corretamente por falta de contacto dentário adequado." },
  // ATM / função
  { category: "Diagnóstico", subcategory: "ATM / função", text: "Disfunção álgica das articulações têmporo-mandibulares." },
  { category: "Diagnóstico", subcategory: "ATM / função", text: "Disfunção articular têmporo-mandibular com estalidos de abertura e frequente bloqueio." },
  { category: "Diagnóstico", subcategory: "ATM / função", text: "Bloqueio articular intermitente. Estalidos e dores articulares." },
  { category: "Diagnóstico", subcategory: "ATM / função", text: "Bruxismo." },
  { category: "Diagnóstico", subcategory: "ATM / função", text: "Alterações da dinâmica mastigatória." },
  { category: "Diagnóstico", subcategory: "ATM / função", text: "Alterações fonatórias." },
  { category: "Diagnóstico", subcategory: "ATM / função", text: "Eversão do lábio inferior por défice de suporte mentoniano." },
  // Vias aéreas / nasal
  { category: "Diagnóstico", subcategory: "Vias aéreas / nasal", text: "Diminuição do espaço respiratório faríngeo." },
  { category: "Diagnóstico", subcategory: "Vias aéreas / nasal", text: "Hipertrofia dos tecidos parafaríngeos." },
  { category: "Diagnóstico", subcategory: "Vias aéreas / nasal", text: "Desvio do septo nasal." },
  { category: "Diagnóstico", subcategory: "Vias aéreas / nasal", text: "Desvio do septo nasal com esporão vomeriano." },
  { category: "Diagnóstico", subcategory: "Vias aéreas / nasal", text: "Desvio complexo do septo nasal com obstrução nasal." },
  { category: "Diagnóstico", subcategory: "Vias aéreas / nasal", text: "Obstrução nasal crónica." },
  { category: "Diagnóstico", subcategory: "Vias aéreas / nasal", text: "Rinite acentuada com atopia." },
  { category: "Diagnóstico", subcategory: "Vias aéreas / nasal", text: "Sinusopatia maxilar." },
  { category: "Diagnóstico", subcategory: "Vias aéreas / nasal", text: "Hipertrofia dos cornetos." },
  { category: "Diagnóstico", subcategory: "Vias aéreas / nasal", text: "Disfunção respiratória noturna do sono." },
  { category: "Diagnóstico", subcategory: "Vias aéreas / nasal", text: "Roncopatia com períodos de apneia." },
  { category: "Diagnóstico", subcategory: "Vias aéreas / nasal", text: "Roncopatia acentuada." },
  { category: "Diagnóstico", subcategory: "Vias aéreas / nasal", text: "Síndrome da apneia obstrutiva do sono." },
  // Fecho
  { category: "Diagnóstico", subcategory: "Fecho", text: "Tendo em conta as discrepâncias dentárias e esqueléticas existentes e as consequentes anomalias funcionais, o doente encontra-se em tratamento ortodôntico com aparatologia fixa tendo em vista o tratamento cirúrgico ortognático programado." },
  { category: "Diagnóstico", subcategory: "Fecho", text: "O doente foi preparado com aparatologia ortodôntica fixa para o tratamento cirúrgico ortognático." },
  { category: "Diagnóstico", subcategory: "Fecho", text: "Tem sido sempre saudável, não existindo anomalias congénitas nem antecedentes familiares importantes a referir." },
  { category: "Diagnóstico", subcategory: "Fecho", text: "Efetuaremos uma «Cirurgia Virtual 3D» na semana anterior à cirurgia e confecionaremos as respetivas guias cirúrgicas." },
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
