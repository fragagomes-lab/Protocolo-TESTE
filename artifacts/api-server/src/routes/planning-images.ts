import { Router, type IRouter } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db, planningImagesTable, protocolsTable } from "@workspace/db";
import {
  ListPlanningImagesParams,
  ListPlanningImagesQueryParams,
  CreatePlanningImageParams,
  CreatePlanningImageBody,
  ReorderPlanningImagesParams,
  ReorderPlanningImagesBody,
  UpdatePlanningImageParams,
  UpdatePlanningImageBody,
  DeletePlanningImageParams,
} from "@workspace/api-zod";
import { blockIfProtocolMissingOrFinalized } from "../lib/protocolGuard";

const router: IRouter = Router();

// Helper: verify protocol exists
async function protocolExists(id: number): Promise<boolean> {
  const [row] = await db
    .select({ id: protocolsTable.id })
    .from(protocolsTable)
    .where(eq(protocolsTable.id, id));
  return !!row;
}

function toImageResponse(img: typeof planningImagesTable.$inferSelect) {
  return {
    ...img,
    createdAt: img.createdAt.toISOString(),
    updatedAt: img.updatedAt.toISOString(),
  };
}

// List planning images
router.get("/protocols/:id/planning-images", async (req, res): Promise<void> => {
  const params = ListPlanningImagesParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const query = ListPlanningImagesQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }

  if (!(await protocolExists(params.data.id))) {
    res.status(404).json({ error: "Protocol not found" });
    return;
  }

  const conditions = [eq(planningImagesTable.protocolId, params.data.id)];
  if (query.data.category) {
    conditions.push(eq(planningImagesTable.category, query.data.category));
  }

  const images = await db
    .select()
    .from(planningImagesTable)
    .where(and(...conditions))
    .orderBy(asc(planningImagesTable.displayOrder), asc(planningImagesTable.createdAt));

  res.json(images.map(toImageResponse));
});

// Create planning image
router.post("/protocols/:id/planning-images", async (req, res): Promise<void> => {
  const params = CreatePlanningImageParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = CreatePlanningImageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  if (await blockIfProtocolMissingOrFinalized(params.data.id, res)) return;

  // Auto-assign next display order if not specified
  let displayOrder = parsed.data.displayOrder ?? 0;
  if (!parsed.data.displayOrder) {
    const existing = await db
      .select({ displayOrder: planningImagesTable.displayOrder })
      .from(planningImagesTable)
      .where(eq(planningImagesTable.protocolId, params.data.id))
      .orderBy(asc(planningImagesTable.displayOrder));
    displayOrder = existing.length > 0
      ? (existing[existing.length - 1].displayOrder + 1)
      : 0;
  }

  // Header photo is exclusive per protocol — clear any existing header first
  if (parsed.data.isHeaderPhoto) {
    await db
      .update(planningImagesTable)
      .set({ isHeaderPhoto: false })
      .where(eq(planningImagesTable.protocolId, params.data.id));
  }

  const [image] = await db.insert(planningImagesTable).values({
    protocolId: params.data.id,
    objectPath: parsed.data.objectPath,
    servingUrl: parsed.data.servingUrl,
    originalName: parsed.data.originalName ?? null,
    caption: parsed.data.caption ?? null,
    category: parsed.data.category,
    phase: parsed.data.phase ?? null,
    captureDate: parsed.data.captureDate ?? null,
    isHeaderPhoto: parsed.data.isHeaderPhoto ?? false,
    displayOrder,
    includeInPdf: parsed.data.includeInPdf ?? true,
  }).returning();

  res.status(201).json(toImageResponse(image));
});

// Reorder planning images
router.post("/protocols/:id/planning-images/reorder", async (req, res): Promise<void> => {
  const params = ReorderPlanningImagesParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = ReorderPlanningImagesBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  if (await blockIfProtocolMissingOrFinalized(params.data.id, res)) return;

  // Update display_order for each image in the new order
  for (let i = 0; i < parsed.data.orderedIds.length; i++) {
    await db
      .update(planningImagesTable)
      .set({ displayOrder: i })
      .where(
        and(
          eq(planningImagesTable.id, parsed.data.orderedIds[i]),
          eq(planningImagesTable.protocolId, params.data.id)
        )
      );
  }

  const images = await db
    .select()
    .from(planningImagesTable)
    .where(eq(planningImagesTable.protocolId, params.data.id))
    .orderBy(asc(planningImagesTable.displayOrder));

  res.json(images.map(toImageResponse));
});

// Update planning image
router.patch("/protocols/:id/planning-images/:imageId", async (req, res): Promise<void> => {
  const params = UpdatePlanningImageParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdatePlanningImageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  if (await blockIfProtocolMissingOrFinalized(params.data.id, res)) return;

  const updateData: Record<string, unknown> = {};
  const d = parsed.data;
  if (d.caption !== undefined) updateData.caption = d.caption;
  if (d.category !== undefined) updateData.category = d.category;
  if (d.phase !== undefined) updateData.phase = d.phase;
  if (d.captureDate !== undefined) updateData.captureDate = d.captureDate;
  if (d.isHeaderPhoto !== undefined) updateData.isHeaderPhoto = d.isHeaderPhoto;
  if (d.displayOrder !== undefined) updateData.displayOrder = d.displayOrder;
  if (d.includeInPdf !== undefined) updateData.includeInPdf = d.includeInPdf;

  // Header photo is exclusive per protocol — clear any existing header first
  if (d.isHeaderPhoto === true) {
    await db
      .update(planningImagesTable)
      .set({ isHeaderPhoto: false })
      .where(eq(planningImagesTable.protocolId, params.data.id));
  }

  const [image] = await db
    .update(planningImagesTable)
    .set(updateData)
    .where(
      and(
        eq(planningImagesTable.id, params.data.imageId),
        eq(planningImagesTable.protocolId, params.data.id)
      )
    )
    .returning();

  if (!image) { res.status(404).json({ error: "Image not found" }); return; }
  res.json(toImageResponse(image));
});

// Delete planning image
router.delete("/protocols/:id/planning-images/:imageId", async (req, res): Promise<void> => {
  const params = DeletePlanningImageParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  if (await blockIfProtocolMissingOrFinalized(params.data.id, res)) return;

  const [deleted] = await db
    .delete(planningImagesTable)
    .where(
      and(
        eq(planningImagesTable.id, params.data.imageId),
        eq(planningImagesTable.protocolId, params.data.id)
      )
    )
    .returning();

  if (!deleted) { res.status(404).json({ error: "Image not found" }); return; }
  res.sendStatus(204);
});

export default router;
