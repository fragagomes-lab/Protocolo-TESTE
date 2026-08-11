import { Router, type IRouter } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db, files3dTable, protocolsTable } from "@workspace/db";
import {
  ListFiles3dParams,
  CreateFile3dParams,
  CreateFile3dBody,
  ReorderFiles3dParams,
  ReorderFiles3dBody,
  UpdateFile3dParams,
  UpdateFile3dBody,
  DeleteFile3dParams,
} from "@workspace/api-zod";
import { blockIfProtocolMissingOrFinalized } from "../lib/protocolGuard";

const router: IRouter = Router();

async function protocolExists(id: number): Promise<boolean> {
  const [row] = await db
    .select({ id: protocolsTable.id })
    .from(protocolsTable)
    .where(eq(protocolsTable.id, id));
  return !!row;
}

function toFileResponse(f: typeof files3dTable.$inferSelect) {
  return {
    ...f,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  };
}

// List 3D files
router.get("/protocols/:id/files-3d", async (req, res): Promise<void> => {
  const params = ListFiles3dParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  if (!(await protocolExists(params.data.id))) {
    res.status(404).json({ error: "Protocol not found" });
    return;
  }

  const files = await db
    .select()
    .from(files3dTable)
    .where(eq(files3dTable.protocolId, params.data.id))
    .orderBy(asc(files3dTable.displayOrder), asc(files3dTable.createdAt));

  res.json(files.map(toFileResponse));
});

// Create 3D file
router.post("/protocols/:id/files-3d", async (req, res): Promise<void> => {
  const params = CreateFile3dParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = CreateFile3dBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  if (await blockIfProtocolMissingOrFinalized(params.data.id, res)) return;

  let displayOrder = parsed.data.displayOrder ?? 0;
  if (!parsed.data.displayOrder) {
    const existing = await db
      .select({ displayOrder: files3dTable.displayOrder })
      .from(files3dTable)
      .where(eq(files3dTable.protocolId, params.data.id))
      .orderBy(asc(files3dTable.displayOrder));
    displayOrder = existing.length > 0
      ? (existing[existing.length - 1].displayOrder + 1)
      : 0;
  }

  const [file] = await db.insert(files3dTable).values({
    protocolId: params.data.id,
    objectPath: parsed.data.objectPath,
    servingUrl: parsed.data.servingUrl,
    originalName: parsed.data.originalName ?? null,
    fileFormat: parsed.data.fileFormat,
    fileType: parsed.data.fileType,
    origin: parsed.data.origin ?? null,
    fileDate: parsed.data.fileDate ?? null,
    version: parsed.data.version ?? null,
    notes: parsed.data.notes ?? null,
    displayOrder,
    includeInPdf: parsed.data.includeInPdf ?? true,
  }).returning();

  res.status(201).json(toFileResponse(file));
});

// Reorder 3D files
router.post("/protocols/:id/files-3d/reorder", async (req, res): Promise<void> => {
  const params = ReorderFiles3dParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = ReorderFiles3dBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  if (await blockIfProtocolMissingOrFinalized(params.data.id, res)) return;

  for (let i = 0; i < parsed.data.orderedIds.length; i++) {
    await db
      .update(files3dTable)
      .set({ displayOrder: i })
      .where(
        and(
          eq(files3dTable.id, parsed.data.orderedIds[i]),
          eq(files3dTable.protocolId, params.data.id)
        )
      );
  }

  const files = await db
    .select()
    .from(files3dTable)
    .where(eq(files3dTable.protocolId, params.data.id))
    .orderBy(asc(files3dTable.displayOrder));

  res.json(files.map(toFileResponse));
});

// Update 3D file
router.patch("/protocols/:id/files-3d/:fileId", async (req, res): Promise<void> => {
  const params = UpdateFile3dParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateFile3dBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  if (await blockIfProtocolMissingOrFinalized(params.data.id, res)) return;

  const updateData: Record<string, unknown> = {};
  const d = parsed.data;
  if (d.fileType !== undefined) updateData.fileType = d.fileType;
  if (d.origin !== undefined) updateData.origin = d.origin;
  if (d.fileDate !== undefined) updateData.fileDate = d.fileDate;
  if (d.version !== undefined) updateData.version = d.version;
  if (d.notes !== undefined) updateData.notes = d.notes;
  if (d.displayOrder !== undefined) updateData.displayOrder = d.displayOrder;
  if (d.includeInPdf !== undefined) updateData.includeInPdf = d.includeInPdf;

  const [file] = await db
    .update(files3dTable)
    .set(updateData)
    .where(
      and(
        eq(files3dTable.id, params.data.fileId),
        eq(files3dTable.protocolId, params.data.id)
      )
    )
    .returning();

  if (!file) { res.status(404).json({ error: "File not found" }); return; }
  res.json(toFileResponse(file));
});

// Delete 3D file
router.delete("/protocols/:id/files-3d/:fileId", async (req, res): Promise<void> => {
  const params = DeleteFile3dParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  if (await blockIfProtocolMissingOrFinalized(params.data.id, res)) return;

  const [deleted] = await db
    .delete(files3dTable)
    .where(
      and(
        eq(files3dTable.id, params.data.fileId),
        eq(files3dTable.protocolId, params.data.id)
      )
    )
    .returning();

  if (!deleted) { res.status(404).json({ error: "File not found" }); return; }
  res.sendStatus(204);
});

export default router;
