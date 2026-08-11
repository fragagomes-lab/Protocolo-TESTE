import { Router, type IRouter } from "express";
import { createHash } from "crypto";
import { eq, and, inArray } from "drizzle-orm";
import OpenAI from "openai";
import { db, planningImagesTable, protocolsTable } from "@workspace/db";
import { blockIfProtocolMissingOrFinalized } from "../lib/protocolGuard";
import { ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const storage = new ObjectStorageService();

// ── AI client (Replit AI Integrations proxy). Nunca expor a chave. ──
// Modelos configuráveis por variável de ambiente (com predefinições sensatas)
const CLASSIFY_MODEL = process.env.PLAN_AI_CLASSIFY_MODEL || "gpt-5.6-luna"; // barato — 1.ª fase
const EXTRACT_MODEL = process.env.PLAN_AI_EXTRACT_MODEL || "gpt-5.6-terra"; // capaz — 2.ª fase

function getAiClient(): OpenAI | null {
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!baseURL || !apiKey) return null;
  return new OpenAI({ baseURL, apiKey });
}

function aiNotConfigured(res: { status: (n: number) => { json: (o: unknown) => void } }) {
  res.status(503).json({
    error: "ai_not_configured",
    message:
      "A integração de IA ainda não está configurada neste ambiente. Nenhuma imagem foi analisada.",
  });
}

type ImgRow = typeof planningImagesTable.$inferSelect;

const isPdf = (img: ImgRow) =>
  !!(img.originalName?.toLowerCase().endsWith(".pdf") || img.objectPath?.toLowerCase().endsWith(".pdf"));

async function loadImageBuffer(objectPath: string): Promise<{ b64: string; mime: string; hash: string } | null> {
  try {
    const file = await storage.getObjectEntityFile(objectPath);
    const [buf] = await file.download();
    const [meta] = await file.getMetadata();
    const mime = (meta.contentType as string) || "image/jpeg";
    return {
      b64: buf.toString("base64"),
      mime: mime.startsWith("image/") ? mime : "image/jpeg",
      hash: createHash("sha256").update(buf).digest("hex"),
    };
  } catch {
    return null;
  }
}

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Resposta da IA sem JSON");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function getProtocol(id: number) {
  const [p] = await db.select().from(protocolsTable).where(eq(protocolsTable.id, id));
  return p;
}

type Analysis = Record<string, unknown> & { history?: Array<Record<string, unknown>> };

async function saveAnalysis(protocolId: number, analysis: Analysis) {
  await db.update(protocolsTable).set({ planAiAnalysis: analysis }).where(eq(protocolsTable.id, protocolId));
  return analysis;
}

function pushHistory(analysis: Analysis, event: string, detail?: Record<string, unknown>) {
  analysis.history = [...(analysis.history ?? []), { at: new Date().toISOString(), event, ...(detail ?? {}) }];
}

// ─────────────────────────────────────────────────────────────
// FASE 1 — classificar imagens (sugestão, nada é eliminado)
// ─────────────────────────────────────────────────────────────
router.post("/protocols/:id/plan-ai/classify", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "invalid id" }); return; }
  if (await blockIfProtocolMissingOrFinalized(id, res)) return;

  const protocol = await getProtocol(id);
  const analysis: Analysis = ((protocol.planAiAnalysis as Analysis) ?? {}) as Analysis;
  const force = !!req.body?.force;
  if (analysis.classification && !force) {
    res.status(409).json({
      error: "already_classified",
      message: "Já existe uma classificação guardada. Confirme antes de repetir a análise (tem custos).",
    });
    return;
  }

  const openai = getAiClient();
  if (!openai) { aiNotConfigured(res); return; }

  const all = await db
    .select()
    .from(planningImagesTable)
    .where(eq(planningImagesTable.protocolId, id));
  const candidates = all.filter((i) => !isPdf(i));
  if (candidates.length === 0) {
    res.status(400).json({ error: "no_images", message: "Sem imagens para analisar." });
    return;
  }

  try {
    // Descarregar e calcular hash (dedup apenas para evitar custo repetido; nada é apagado)
    const loaded: Array<{ img: ImgRow; b64: string; mime: string; hash: string }> = [];
    const seen = new Map<string, number>(); // hash -> imageId analisada
    const duplicates: Array<{ imageId: number; duplicateOf: number }> = [];
    for (const img of candidates) {
      const data = await loadImageBuffer(img.objectPath);
      if (!data) continue;
      if (img.contentHash !== data.hash) {
        await db.update(planningImagesTable).set({ contentHash: data.hash }).where(eq(planningImagesTable.id, img.id));
      }
      const dupOf = seen.get(data.hash);
      if (dupOf !== undefined) {
        duplicates.push({ imageId: img.id, duplicateOf: dupOf });
      } else {
        seen.set(data.hash, img.id);
        loaded.push({ img, ...data });
      }
    }

    // Classificar em lotes para não exceder limites
    const results = new Map<number, { classification: string; reason: string }>();
    const BATCH = 6;
    for (let i = 0; i < loaded.length; i += BATCH) {
      const batch = loaded.slice(i, i + BATCH);
      const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
        {
          type: "text",
          text:
            `És um assistente técnico que classifica capturas de ecrã de planeamento cirúrgico virtual ortognático (ex.: Dolphin). ` +
            `Para CADA imagem indica se aparenta conter RESULTADOS/MEDIÇÕES FINAIS (tabelas finais de landmark offsets, vistas pós-operatórias finais com medições, comparações pré/pós finais) ` +
            `ou se aparenta ser INTERMÉDIA (sequências de movimentos, workups, tentativas, estados intermédios) ou UNKNOWN se não for possível determinar. ` +
            `Não interpretes valores nesta fase. Responde APENAS JSON: {"results":[{"imageId":number,"classification":"final"|"intermediate"|"unknown","reason":"curta justificação em português"}]}. ` +
            `Imagens por ordem, com os ids: ${batch.map((b) => b.img.id).join(", ")}.`,
        },
        ...batch.map((b) => ({
          type: "image_url" as const,
          image_url: { url: `data:${b.mime};base64,${b.b64}` },
        })),
      ];
      const resp = await openai.chat.completions.create({
        model: CLASSIFY_MODEL,
        max_completion_tokens: 8192,
        messages: [{ role: "user", content }],
      });
      const parsed = extractJson(resp.choices[0]?.message?.content ?? "") as {
        results?: Array<{ imageId: number; classification: string; reason?: string }>;
      };
      for (const r of parsed.results ?? []) {
        if (batch.some((b) => b.img.id === r.imageId)) {
          const cls = ["final", "intermediate", "unknown"].includes(r.classification) ? r.classification : "unknown";
          results.set(r.imageId, { classification: cls, reason: r.reason ?? "" });
        }
      }
    }

    // Duplicados herdam a classificação do original (sem nova chamada, sem eliminação)
    for (const dup of duplicates) {
      const orig = results.get(dup.duplicateOf);
      if (orig) results.set(dup.imageId, { classification: orig.classification, reason: `Duplicado da imagem #${dup.duplicateOf} — ${orig.reason}` });
    }

    for (const [imageId, r] of results) {
      await db
        .update(planningImagesTable)
        .set({ aiClassification: r.classification, aiClassificationReason: r.reason })
        .where(and(eq(planningImagesTable.id, imageId), eq(planningImagesTable.protocolId, id)));
    }

    // Auditoria: arquivar a classificação anterior em vez de a destruir
    if (analysis.classification) {
      (analysis as any).archivedClassifications = [
        ...(((analysis as any).archivedClassifications as unknown[]) ?? []),
        { archivedAt: new Date().toISOString(), classification: analysis.classification },
      ];
    }
    analysis.classification = {
      at: new Date().toISOString(),
      model: CLASSIFY_MODEL,
      imageIds: loaded.map((l) => l.img.id),
      duplicates,
      counts: {
        final: [...results.values()].filter((r) => r.classification === "final").length,
        intermediate: [...results.values()].filter((r) => r.classification === "intermediate").length,
        unknown: [...results.values()].filter((r) => r.classification === "unknown").length,
      },
    };
    pushHistory(analysis, force ? "classificacao_repetida" : "classificacao_executada", { imagens: candidates.length });
    await saveAnalysis(id, analysis);
    res.json(analysis);
  } catch (err) {
    res.status(502).json({ error: "ai_error", message: `Erro na análise de IA: ${err instanceof Error ? err.message : "desconhecido"}` });
  }
});

// ─────────────────────────────────────────────────────────────
// FASE 2 — extrair medidas finais + sugerir diagnóstico (mesma chamada)
// ─────────────────────────────────────────────────────────────
router.post("/protocols/:id/plan-ai/extract", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "invalid id" }); return; }
  if (await blockIfProtocolMissingOrFinalized(id, res)) return;

  const imageIds: number[] = Array.isArray(req.body?.imageIds) ? req.body.imageIds.map(Number).filter(Number.isInteger) : [];
  if (imageIds.length === 0) { res.status(400).json({ error: "no_images", message: "Selecione as imagens confirmadas com medidas finais." }); return; }

  const protocol = await getProtocol(id);
  const analysis: Analysis = ((protocol.planAiAnalysis as Analysis) ?? {}) as Analysis;
  const force = !!req.body?.force;
  if (analysis.extraction && !force) {
    res.status(409).json({
      error: "already_extracted",
      message: "Já existe uma extração guardada. Confirme antes de repetir (tem custos e substitui as propostas por rever).",
    });
    return;
  }

  const openai = getAiClient();
  if (!openai) { aiNotConfigured(res); return; }

  const rows = await db
    .select()
    .from(planningImagesTable)
    .where(and(eq(planningImagesTable.protocolId, id), inArray(planningImagesTable.id, imageIds)));
  if (rows.length !== imageIds.length) {
    res.status(400).json({ error: "invalid_images", message: "Uma ou mais imagens indicadas não pertencem a este protocolo." });
    return;
  }
  // A seleção gravada pelo cirurgião é a autoridade — não o pedido do cliente.
  const confirmed = rows.filter((r) => r.isFinalMeasurement === true && r.selectedForExtraction === true && !isPdf(r));
  if (confirmed.length === 0) {
    res.status(400).json({ error: "none_confirmed", message: "Nenhuma das imagens selecionadas está confirmada como medidas finais e marcada para pré-preenchimento." });
    return;
  }

  try {
    const loaded: Array<{ img: ImgRow; b64: string; mime: string }> = [];
    const seenHash = new Set<string>();
    for (const img of confirmed) {
      const data = await loadImageBuffer(img.objectPath);
      if (!data) continue;
      if (seenHash.has(data.hash)) continue; // dedup só para custo; a imagem permanece arquivada
      seenHash.add(data.hash);
      loaded.push({ img, b64: data.b64, mime: data.mime });
    }

    const fieldList = [
      "maxilla.sagittalRight / maxilla.verticalRight / maxilla.transverseRight (mm — LADO DIREITO do maxilar, do landmark PNS/ENP)",
      "maxilla.sagittalLeft / maxilla.verticalLeft / maxilla.transverseLeft (mm — LADO ESQUERDO do maxilar, do landmark A-Point)",
      "maxilla.sagittal / maxilla.vertical / maxilla.transverse (mm — só se existir apenas um valor global sem lados)",
      "maxilla.rotation (graus, yaw)",
      "maxilla.segment.<nome> (para maxila segmentada: anterior, posterior_left, posterior_right — mesmos subcampos)",
      "mandible.sagittal (mm)", "mandible.vertical (mm)",
      "mandible.transverseRight (mm)", "mandible.transverseLeft (mm)",
      "mandible.transverse (mm — um único valor transversal sem lado)",
      "mandible.rotation (graus)",
      "chin.sagittal (mm)", "chin.vertical (mm)", "chin.transverse (mm)",
      "other (APENAS para medições sem qualquer campo acima; movimentos transversais de maxila/mandíbula/mento NUNCA são 'other' — usa os campos transverse)",
    ].join("; ");

    const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      {
        type: "text",
        text:
          `És um assistente de extração de dados de planeamento cirúrgico ortognático virtual (Dolphin ou similar). As imagens seguintes foram CONFIRMADAS pelo cirurgião como contendo medições FINAIS. ` +
          `Ids das imagens, por ordem: ${loaded.map((l) => l.img.id).join(", ")}.\n\n` +
          `TAREFA 1 — EXTRAÇÃO: extrai APENAS medições finais legíveis (tabelas, landmark offsets, movimentos finais, lateralidade, osteotomias/segmentos visíveis). ` +
          `IGNORA sequências de movimentos, workups, tentativas e valores intermédios, mesmo que apareçam nas imagens. ` +
          `NÃO formules escolha de tratamento, NÃO proponhas movimentos diferentes, NÃO infiras valores ausentes, NÃO inventes texto. ` +
          `Se um valor estiver ilegível, ambíguo ou sem correspondência segura, marca undetermined=true e deixa value=null. ` +
          `Preserva o sinal e pelo menos duas casas decimais tal como legível. Campos possíveis: ${fieldList}.\n\n` +
          `CONVENÇÃO DESTE CIRURGIÃO (Landmark Offset Tables — segue-a SEMPRE, prevalece sobre o significado cefalométrico habitual): ` +
          `PNS/ENP = avanço REAL do lado DIREITO do maxilar (degrau da placa paranasal dta.) → maxilla.sagittalRight (coluna A-P), maxilla.verticalRight (Vert), maxilla.transverseRight (R-L). ` +
          `A-Point = lado ESQUERDO do maxilar (placa paranasal esq.) → maxilla.sagittalLeft / verticalLeft / transverseLeft. ` +
          `B-Point = movimentos da MANDÍBULA → mandible.sagittal/vertical/transverse. ` +
          `Pogonion = movimento sagital de mandíbula+mento SOMADOS: calcula chin.sagittal = Pogonion(A-P) − B-Point(A-P) e mostra a conta em note (ex.: "Pogónio +5.53 − B +4.00 = +1.53"); ` +
          `faz o mesmo para chin.vertical e chin.transverse (Pogonion − B-Point, conta em note). Se existir um movimento de genioplastia explícito na lista de movimentos, esse prevalece sobre o cálculo. ` +
          `Usa a secção "(Model Block)"/movimento do bloco quando existir; caso contrário a secção geral. ` +
          `NÃO cries propostas individuais para offsets de marcos DENTÁRIOS (incisivos, caninos, cúspides U3/U6/L6, ANS, PNS, gonion, condylar points) — são redundantes para o plano; ` +
          `se algo dentário for excecionalmente relevante, resume-o numa única proposta "other" com note. ` +
          `Rotações/yaw/roll/pitch visíveis vão para os campos rotation. Mantém a lista de propostas curta e centrada nos módulos.\n\n`+
          `TAREFA 2 — DIAGNÓSTICO SUGERIDO: com base no conjunto (comparações pré/pós, segmentos, movimentos finais, landmarks), sugere o enquadramento da deformidade dentofacial que o planeamento procura corrigir. ` +
          `Podes dar mais de uma hipótese se a informação não for inequívoca; indica o grau de confiança e os elementos visuais que a sustentam. Nunca apresentes como definitivo.\n\n` +
          `Responde APENAS JSON válido:\n` +
          `{"proposals":[{"targetField":string,"label":string,"value":number|null,"unit":"mm"|"deg"|null,"side":"left"|"right"|"bilateral"|null,"sourceImageId":number,"referenceText":string,"undetermined":boolean,"note":string}],` +
          `"diagnosis":{"hypotheses":[{"diagnosis":string,"rationale":string,"confidence":"alta"|"moderada"|"baixa","sourceImageIds":[number]}],"uncertain":boolean,"comment":string}}\n` +
          `Tudo em português europeu.`,
      },
      ...loaded.map((l) => ({
        type: "image_url" as const,
        image_url: { url: `data:${l.mime};base64,${l.b64}` },
      })),
    ];

    const resp = await openai.chat.completions.create({
      model: EXTRACT_MODEL,
      max_completion_tokens: 8192,
      messages: [{ role: "user", content }],
    });
    const raw = resp.choices[0]?.message?.content ?? "";
    const parsed = extractJson(raw) as {
      proposals?: Array<Record<string, unknown>>;
      diagnosis?: { hypotheses?: Array<Record<string, unknown>>; uncertain?: boolean; comment?: string };
    };

    const now = new Date().toISOString();
    // Auditoria: nunca destruir resultados anteriores — arquivar antes de substituir
    if (analysis.extraction || analysis.diagnosis) {
      (analysis as any).archivedRuns = [
        ...(((analysis as any).archivedRuns as unknown[]) ?? []),
        { archivedAt: now, extraction: analysis.extraction ?? null, diagnosis: analysis.diagnosis ?? null },
      ];
    }
    analysis.extraction = {
      at: now,
      model: EXTRACT_MODEL,
      sourceImageIds: loaded.map((l) => l.img.id),
      // resultado ORIGINAL da IA — imutável para auditoria
      aiRaw: { proposals: parsed.proposals ?? [], diagnosis: parsed.diagnosis ?? null },
      proposals: (parsed.proposals ?? []).map((p, i) => ({
        id: `p${i + 1}`,
        ...p,
        review: null, // {status: confirmed|corrected|rejected, value, unit, at}
      })),
      reviewCompletedAt: null,
    };
    analysis.diagnosis = {
      at: now,
      model: EXTRACT_MODEL,
      sourceImageIds: loaded.map((l) => l.img.id),
      suggestions: parsed.diagnosis?.hypotheses ?? [],
      uncertain: parsed.diagnosis?.uncertain ?? true,
      comment: parsed.diagnosis?.comment ?? "",
      status: "pending", // pending | confirmed | rejected
      confirmedText: null,
      confirmedAt: null,
    };
    pushHistory(analysis, force ? "extracao_repetida" : "extracao_executada", { imagens: loaded.length });
    await saveAnalysis(id, analysis);
    res.json(analysis);
  } catch (err) {
    res.status(502).json({ error: "ai_error", message: `Erro na extração por IA: ${err instanceof Error ? err.message : "desconhecido"}` });
  }
});

// ─────────────────────────────────────────────────────────────
// Revisão humana — confirmar / corrigir / rejeitar (auditável)
// ─────────────────────────────────────────────────────────────
router.patch("/protocols/:id/plan-ai/review", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "invalid id" }); return; }
  if (await blockIfProtocolMissingOrFinalized(id, res)) return;

  const protocol = await getProtocol(id);
  const analysis: Analysis = ((protocol.planAiAnalysis as Analysis) ?? {}) as Analysis;
  const body = req.body ?? {};
  const now = new Date().toISOString();

  const extraction = analysis.extraction as { proposals?: Array<Record<string, unknown>>; reviewCompletedAt?: string | null } | undefined;

  if (Array.isArray(body.proposals) && extraction?.proposals) {
    for (const upd of body.proposals) {
      const target = extraction.proposals.find((p) => p.id === upd.id);
      if (!target) continue;
      const status = ["confirmed", "corrected", "rejected"].includes(upd.status) ? upd.status : null;
      if (!status) continue;
      target.review = {
        status,
        value: status === "corrected" ? (upd.value ?? null) : status === "confirmed" ? (target.value ?? null) : null,
        unit: upd.unit ?? target.unit ?? null,
        at: now,
      };
      pushHistory(analysis, "proposta_revista", { proposalId: upd.id, status });
    }
  }

  if (body.diagnosis && analysis.diagnosis) {
    const d = analysis.diagnosis as Record<string, unknown>;
    const status = ["confirmed", "rejected"].includes(body.diagnosis.status) ? body.diagnosis.status : null;
    if (status) {
      d.status = status;
      d.confirmedText = status === "confirmed" ? String(body.diagnosis.confirmedText ?? "") : null;
      d.confirmedAt = now;
      pushHistory(analysis, status === "confirmed" ? "diagnostico_confirmado" : "diagnostico_rejeitado");
    }
  }

  if (body.globalConfirm === true && extraction?.proposals) {
    const pending = extraction.proposals.filter((p) => !p.review);
    if (pending.length > 0) {
      res.status(409).json({ error: "review_incomplete", message: `Ainda há ${pending.length} proposta(s) por rever. Reveja todas antes da confirmação global.` });
      return;
    }
    extraction.reviewCompletedAt = now;
    pushHistory(analysis, "confirmacao_global");
  }

  await saveAnalysis(id, analysis);
  res.json(analysis);
});

export default router;
