import { Router, type IRouter } from "express";
import { eq, desc, like, sql, and } from "drizzle-orm";
import { db, protocolsTable } from "@workspace/db";
import {
  ListProtocolsQueryParams,
  CreateProtocolBody,
  GetProtocolParams,
  UpdateProtocolParams,
  UpdateProtocolBody,
  DeleteProtocolParams,
  DuplicateProtocolParams,
  GenerateOperativeDescriptionParams,
} from "@workspace/api-zod";
import { blockIfProtocolMissingOrFinalized } from "../lib/protocolGuard";

const router: IRouter = Router();

// List protocols
router.get("/protocols", async (req, res): Promise<void> => {
  const parsed = ListProtocolsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search, status, surgeryType } = parsed.data;

  const conditions = [];
  if (search) {
    conditions.push(
      sql`(${protocolsTable.patientName} ILIKE ${"%" + search + "%"} OR ${protocolsTable.processNumber} ILIKE ${"%" + search + "%"})`,
    );
  }
  if (status) {
    conditions.push(eq(protocolsTable.status, status));
  }
  if (surgeryType) {
    conditions.push(eq(protocolsTable.surgeryType, surgeryType));
  }

  const protocols = await db
    .select({
      id: protocolsTable.id,
      processNumber: protocolsTable.processNumber,
      patientName: protocolsTable.patientName,
      patientDOB: protocolsTable.patientDOB,
      surgeryDate: protocolsTable.surgeryDate,
      surgeryType: protocolsTable.surgeryType,
      status: protocolsTable.status,
      surgeon: sql<string | null>`(${protocolsTable.team}->>'surgeon')`,
      createdAt: protocolsTable.createdAt,
      updatedAt: protocolsTable.updatedAt,
    })
    .from(protocolsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(protocolsTable.updatedAt));

  res.json(
    protocols.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  );
});

// Create protocol
router.post("/protocols", async (req, res): Promise<void> => {
  const parsed = CreateProtocolBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid protocol body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const {
    processNumber,
    patientName,
    patientDOB,
    patientAge,
    patientGender,
    surgeryDate,
    surgeryType,
    status,
    team,
    checklist,
    preopDiagnosis,
    surgicalPlan,
    surgicalSequence,
    intraopRecord,
    materials,
    piezoEquipment,
    surgicalDiagrams,
    operativeDescription,
    postopNotes,
  } = parsed.data;

  const [protocol] = await db
    .insert(protocolsTable)
    .values({
      processNumber,
      patientName,
      patientDOB: patientDOB ?? null,
      patientAge: patientAge ?? null,
      patientGender: patientGender ?? null,
      surgeryDate: surgeryDate ?? null,
      surgeryType: surgeryType ?? "",
      status: status ?? "draft",
      team: team ?? null,
      checklist: checklist ?? null,
      preopDiagnosis: preopDiagnosis ?? null,
      surgicalPlan: surgicalPlan ?? null,
      surgicalSequence: surgicalSequence ?? null,
      intraopRecord: intraopRecord ?? null,
      materials: materials ?? null,
      piezoEquipment: piezoEquipment ?? null,
      surgicalDiagrams: surgicalDiagrams ?? null,
      operativeDescription: operativeDescription ?? "",
      postopNotes: postopNotes ?? "",
    })
    .returning();

  res.status(201).json(toProtocolResponse(protocol));
});

// Stats
router.get("/protocols/stats", async (_req, res): Promise<void> => {
  const [total] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(protocolsTable);
  const statusRows = await db
    .select({
      status: protocolsTable.status,
      count: sql<number>`count(*)::int`,
    })
    .from(protocolsTable)
    .groupBy(protocolsTable.status);
  const surgeryTypeRows = await db
    .select({
      surgeryType: protocolsTable.surgeryType,
      count: sql<number>`count(*)::int`,
    })
    .from(protocolsTable)
    .groupBy(protocolsTable.surgeryType)
    .orderBy(desc(sql`count(*)`));

  const byStatus = {
    draft: 0,
    preop_complete: 0,
    intraop_complete: 0,
    finalized: 0,
  } as Record<string, number>;
  for (const row of statusRows) {
    byStatus[row.status] = row.count;
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const [recentResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(protocolsTable)
    .where(sql`${protocolsTable.createdAt} >= ${sevenDaysAgo}`);

  res.json({
    total: total.count,
    byStatus,
    bySurgeryType: surgeryTypeRows,
    recentCount: recentResult.count,
  });
});

// Recent protocols
router.get("/protocols/recent", async (_req, res): Promise<void> => {
  const protocols = await db
    .select({
      id: protocolsTable.id,
      processNumber: protocolsTable.processNumber,
      patientName: protocolsTable.patientName,
      patientDOB: protocolsTable.patientDOB,
      surgeryDate: protocolsTable.surgeryDate,
      surgeryType: protocolsTable.surgeryType,
      status: protocolsTable.status,
      surgeon: sql<string | null>`(${protocolsTable.team}->>'surgeon')`,
      createdAt: protocolsTable.createdAt,
      updatedAt: protocolsTable.updatedAt,
    })
    .from(protocolsTable)
    .orderBy(desc(protocolsTable.updatedAt))
    .limit(10);

  res.json(
    protocols.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  );
});

// Get protocol
router.get("/protocols/:id", async (req, res): Promise<void> => {
  const params = GetProtocolParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [protocol] = await db
    .select()
    .from(protocolsTable)
    .where(eq(protocolsTable.id, params.data.id));
  if (!protocol) {
    res.status(404).json({ error: "Protocol not found" });
    return;
  }

  res.json(toProtocolResponse(protocol));
});

// Update protocol
router.patch("/protocols/:id", async (req, res): Promise<void> => {
  const params = UpdateProtocolParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateProtocolBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;

  // Guard: a finalized protocol is a signed-off surgical record and may not be
  // edited through the API. The ONLY mutation allowed is the explicit
  // un-finalize transition — a status-only payload that moves status away from
  // "finalized". Any other field (even alongside a status change) is rejected,
  // so a combined un-finalize + edit request cannot slip clinical changes past
  // the lock.
  const [existing] = await db
    .select({ status: protocolsTable.status })
    .from(protocolsTable)
    .where(eq(protocolsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Protocol not found" });
    return;
  }
  let isUnfinalize = false;
  if (existing.status === "finalized") {
    // Besides `status`, the only key allowed on the un-finalize payload is
    // `reopenedBy` — an audit-only field naming who reopened the record. It is
    // never written to a clinical column, so it cannot smuggle edits.
    const keys = Object.keys(data).filter((k) => k !== "reopenedBy");
    const isStatusOnlyUnfinalize =
      keys.length === 1 &&
      data.status !== undefined &&
      data.status !== "finalized";
    if (!isStatusOnlyUnfinalize) {
      res
        .status(409)
        .json({ error: "Protocolo finalizado — não pode ser modificado." });
      return;
    }
    isUnfinalize = true;
  }

  const updateData: Record<string, unknown> = {};

  // Audit trail: reopening a finalized surgical record is clinically
  // significant. Append (never overwrite) a reopen event with a server-side
  // timestamp. The actor comes from the client-supplied `reopenedBy` name
  // (there is no authentication yet); if auth is added later, replace it with
  // the authenticated user's identity.
  if (isUnfinalize) {
    const [current] = await db
      .select({ reopenHistory: protocolsTable.reopenHistory })
      .from(protocolsTable)
      .where(eq(protocolsTable.id, params.data.id));
    const history = Array.isArray(current?.reopenHistory)
      ? (current.reopenHistory as Array<Record<string, unknown>>)
      : [];
    const actor =
      typeof data.reopenedBy === "string" && data.reopenedBy.trim().length > 0
        ? data.reopenedBy.trim()
        : null;
    updateData.reopenHistory = [
      ...history,
      { reopenedAt: new Date().toISOString(), reopenedBy: actor },
    ];
  }

  if (data.processNumber !== undefined)
    updateData.processNumber = data.processNumber;
  if (data.patientName !== undefined) updateData.patientName = data.patientName;
  if (data.patientDOB !== undefined) updateData.patientDOB = data.patientDOB;
  if (data.patientAge !== undefined) updateData.patientAge = data.patientAge;
  if (data.patientGender !== undefined)
    updateData.patientGender = data.patientGender;
  if (data.surgeryDate !== undefined) updateData.surgeryDate = data.surgeryDate;
  if (data.surgeryType !== undefined) updateData.surgeryType = data.surgeryType;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.team !== undefined) updateData.team = data.team;
  if (data.checklist !== undefined) updateData.checklist = data.checklist;
  if (data.preopDiagnosis !== undefined)
    updateData.preopDiagnosis = data.preopDiagnosis;
  if (data.surgicalPlan !== undefined)
    updateData.surgicalPlan = data.surgicalPlan;
  if (data.surgicalSequence !== undefined)
    updateData.surgicalSequence = data.surgicalSequence;
  if (data.intraopRecord !== undefined)
    updateData.intraopRecord = data.intraopRecord;
  if (data.materials !== undefined) updateData.materials = data.materials;
  if (data.piezoEquipment !== undefined)
    updateData.piezoEquipment = data.piezoEquipment;
  if (data.surgicalDiagrams !== undefined)
    updateData.surgicalDiagrams = data.surgicalDiagrams;
  if (data.operativeDescription !== undefined)
    updateData.operativeDescription = data.operativeDescription;
  if (data.postopNotes !== undefined) updateData.postopNotes = data.postopNotes;

  const [protocol] = await db
    .update(protocolsTable)
    .set(updateData)
    .where(eq(protocolsTable.id, params.data.id))
    .returning();

  if (!protocol) {
    res.status(404).json({ error: "Protocol not found" });
    return;
  }

  res.json(toProtocolResponse(protocol));
});

// Delete protocol
router.delete("/protocols/:id", async (req, res): Promise<void> => {
  const params = DeleteProtocolParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Guard: a finalized protocol is a signed-off surgical record. Deleting one
  // through the API would permanently destroy it; refuse (409) unless the record
  // is first un-finalized. Missing protocols respond 404.
  if (await blockIfProtocolMissingOrFinalized(params.data.id, res)) {
    return;
  }

  const [deleted] = await db
    .delete(protocolsTable)
    .where(eq(protocolsTable.id, params.data.id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Protocol not found" });
    return;
  }

  res.sendStatus(204);
});

// Duplicate protocol
//
// Decision: duplicating a FINALIZED protocol is PERMITTED. The finalized lock
// protects the signed-off record itself (edit/delete are refused with 409);
// duplication never mutates the source — it inserts a brand-new row. To keep
// the copy from masquerading as a signed-off report, the copy is explicitly
// forced to status "draft" and its process number gets a unique "-CÓPIA(-N)"
// suffix (see nextCopyProcessNumber). This is asserted below (not incidental)
// and covered by e2e (protocolo-cirurgico/e2e/clinical-media.spec.ts).
router.post("/protocols/:id/duplicate", async (req, res): Promise<void> => {
  const params = DuplicateProtocolParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [original] = await db
    .select()
    .from(protocolsTable)
    .where(eq(protocolsTable.id, params.data.id));
  if (!original) {
    res.status(404).json({ error: "Protocol not found" });
    return;
  }

  // Lifecycle/audit fields must NOT carry over to a copy: the duplicate is a
  // brand-new draft that was never finalized, so inheriting the source's
  // reopen history would fabricate audit events on the new record.
  const { id, createdAt, updatedAt, processNumber, reopenHistory, ...rest } =
    original;
  void id;
  void createdAt;
  void updatedAt;
  void reopenHistory;

  const copyProcessNumber = await nextCopyProcessNumber(processNumber);

  const [copy] = await db
    .insert(protocolsTable)
    .values({
      ...rest,
      processNumber: copyProcessNumber,
      // Invariant: a duplicate is always a fresh draft, never a copy of the
      // source's status. A finalized source must not fork into a second
      // "finalized" record.
      status: "draft",
    })
    .returning();

  if (copy.status !== "draft") {
    // Defensive assertion: the draft-status invariant above must hold.
    req.log.error(
      { copyId: copy.id, status: copy.status },
      "Duplicate did not produce a draft",
    );
    res
      .status(500)
      .json({ error: "Falha ao duplicar: a cópia não ficou em rascunho." });
    return;
  }

  res.status(201).json(toProtocolResponse(copy));
});

// Generate operative description
router.post(
  "/protocols/:id/generate-description",
  async (req, res): Promise<void> => {
    const params = GenerateOperativeDescriptionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [protocol] = await db
      .select()
      .from(protocolsTable)
      .where(eq(protocolsTable.id, params.data.id));
    if (!protocol) {
      res.status(404).json({ error: "Protocol not found" });
      return;
    }

    const description = generateDescription(protocol);
    res.json({ description });
  },
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Compute a unique process number for a duplicate.
 *
 * Naming rules (prevent duplicate copies from colliding):
 * - Duplicating "X" yields "X-CÓPIA"; duplicating again yields "X-CÓPIA-2",
 *   then "X-CÓPIA-3", …
 * - Duplicating a copy ("X-CÓPIA" or "X-CÓPIA-N") does NOT chain suffixes:
 *   the "-CÓPIA(-N)" tail is stripped first, so the new copy is numbered off
 *   the ORIGINAL base ("X-CÓPIA-2", never "X-CÓPIA-CÓPIA").
 * - The next number is 1 + the highest existing "X-CÓPIA(-N)" in the DB, so
 *   repeated duplication always yields distinct process numbers even if some
 *   intermediate copies were renamed or deleted out of order.
 */
export async function nextCopyProcessNumber(
  sourceProcessNumber: string,
): Promise<string> {
  // Strip an existing copy suffix so copies of copies don't chain.
  const base = sourceProcessNumber.replace(/-CÓPIA(-\d+)?$/u, "");

  // Escape LIKE wildcards in the base before scanning for existing copies.
  const escapedLike = base.replace(/[\\%_]/g, (c) => "\\" + c);
  const existing = await db
    .select({ processNumber: protocolsTable.processNumber })
    .from(protocolsTable)
    .where(like(protocolsTable.processNumber, escapedLike + "-CÓPIA%"));

  // Highest existing copy index for this base: "X-CÓPIA" counts as 1,
  // "X-CÓPIA-N" counts as N. 0 means no copies yet → plain "-CÓPIA".
  const escapedRe = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const suffixRe = new RegExp("^" + escapedRe + "-CÓPIA(-(\\d+))?$", "u");
  let highest = 0;
  for (const row of existing) {
    const m = row.processNumber.match(suffixRe);
    if (!m) continue;
    const n = m[2] ? parseInt(m[2], 10) : 1;
    if (n > highest) highest = n;
  }

  return highest === 0 ? `${base}-CÓPIA` : `${base}-CÓPIA-${highest + 1}`;
}

function toProtocolResponse(p: typeof protocolsTable.$inferSelect) {
  return {
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function generateDescription(
  protocol: typeof protocolsTable.$inferSelect,
): string {
  const lines: string[] = [];
  const plan = protocol.surgicalPlan as Record<string, unknown> | null;
  const team = protocol.team as Record<string, string> | null;
  const sequence =
    (protocol.surgicalSequence as Array<{
      order: number;
      description: string;
    }> | null) ?? [];

  lines.push(
    `Protocolo Operatório — ${protocol.surgeryType || "Cirurgia Ortognática"}`,
  );
  lines.push(
    `Doente: ${protocol.patientName} | Processo: ${protocol.processNumber}`,
  );
  if (protocol.surgeryDate)
    lines.push(`Data de cirurgia: ${protocol.surgeryDate}`);
  if (team?.surgeon) lines.push(`Cirurgião: ${team.surgeon}`);
  lines.push("");

  if (plan) {
    const maxilla = plan.maxilla as Record<string, unknown> | null;
    const mandible = plan.mandible as Record<string, unknown> | null;
    const chin = plan.chin as Record<string, unknown> | null;
    const associated =
      (plan.associated as Array<{ name: string; details?: string }> | null) ??
      [];

    if (maxilla?.included) {
      lines.push(`MAXILA: ${maxilla.osteotomyType ?? ""}`);
      const segs =
        (maxilla.segments as Array<{
          segment: string;
          movements: Record<string, number | null>;
        }> | null) ?? [];
      for (const seg of segs) {
        const mv = seg.movements ?? {};
        const parts = [];
        if (mv.vertical != null)
          parts.push(`vertical ${mv.vertical > 0 ? "+" : ""}${mv.vertical}mm`);
        if (mv.sagittal != null)
          parts.push(`sagital ${mv.sagittal > 0 ? "+" : ""}${mv.sagittal}mm`);
        if (mv.transverseLeft != null)
          parts.push(
            `transversal esq ${mv.transverseLeft > 0 ? "+" : ""}${mv.transverseLeft}mm`,
          );
        if (mv.transverseRight != null)
          parts.push(
            `transversal dir ${mv.transverseRight > 0 ? "+" : ""}${mv.transverseRight}mm`,
          );
        if (parts.length)
          lines.push(`  Segmento ${seg.segment}: ${parts.join(", ")}`);
      }
    }

    if (mandible?.included) {
      lines.push(`MANDÍBULA: ${mandible.osteotomyType ?? ""}`);
      const mv = (mandible.movements as Record<string, number | null>) ?? {};
      const parts = [];
      if (mv.sagittal != null)
        parts.push(`sagital ${mv.sagittal > 0 ? "+" : ""}${mv.sagittal}mm`);
      if (mv.vertical != null)
        parts.push(`vertical ${mv.vertical > 0 ? "+" : ""}${mv.vertical}mm`);
      if (mv.transverseLeft != null)
        parts.push(
          `transversal esq ${mv.transverseLeft > 0 ? "+" : ""}${mv.transverseLeft}mm`,
        );
      if (parts.length) lines.push(`  Movimentos: ${parts.join(", ")}`);
    }

    if (chin?.included) {
      lines.push(`MENTO: ${chin.procedure ?? ""}`);
      const mv = (chin.movements as Record<string, number | null>) ?? {};
      const parts = [];
      if (mv.sagittal != null)
        parts.push(`avanço ${mv.sagittal > 0 ? "+" : ""}${mv.sagittal}mm`);
      if (mv.vertical != null)
        parts.push(`vertical ${mv.vertical > 0 ? "+" : ""}${mv.vertical}mm`);
      if (parts.length) lines.push(`  Movimentos: ${parts.join(", ")}`);
    }

    if (associated.length > 0) {
      lines.push(`PROCEDIMENTOS ASSOCIADOS:`);
      for (const proc of associated) {
        lines.push(
          `  - ${proc.name}${proc.details ? ": " + proc.details : ""}`,
        );
      }
    }
  }

  if (sequence.length > 0) {
    lines.push("");
    lines.push("SEQUÊNCIA CIRÚRGICA:");
    const sorted = [...sequence].sort((a, b) => a.order - b.order);
    for (const step of sorted) {
      lines.push(`  ${step.order}. ${step.description}`);
    }
  }

  lines.push("");
  lines.push(
    "Cirurgia realizada sob anestesia geral. Sem intercorrências relevantes.",
  );

  return lines.join("\n");
}

export default router;
