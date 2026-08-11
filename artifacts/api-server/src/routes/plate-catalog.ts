import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, plateCatalogTable } from "@workspace/db";
import {
  ListPlateCatalogQueryParams,
  CreatePlateCatalogEntryBody,
  UpdatePlateCatalogEntryParams,
  UpdatePlateCatalogEntryBody,
  DeletePlateCatalogEntryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toEntryResponse(e: typeof plateCatalogTable.$inferSelect) {
  return {
    ...e,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

// List catalogue entries
router.get("/plate-catalog", async (req, res): Promise<void> => {
  const query = ListPlateCatalogQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }

  const rows = query.data.manufacturer
    ? await db
        .select()
        .from(plateCatalogTable)
        .where(eq(plateCatalogTable.manufacturer, query.data.manufacturer))
        .orderBy(asc(plateCatalogTable.manufacturer), asc(plateCatalogTable.reference))
    : await db
        .select()
        .from(plateCatalogTable)
        .orderBy(asc(plateCatalogTable.manufacturer), asc(plateCatalogTable.reference));

  res.json(rows.map(toEntryResponse));
});

// Create catalogue entry
router.post("/plate-catalog", async (req, res): Promise<void> => {
  const parsed = CreatePlateCatalogEntryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [entry] = await db.insert(plateCatalogTable).values({
    manufacturer: parsed.data.manufacturer,
    system: parsed.data.system ?? null,
    plateType: parsed.data.plateType ?? null,
    geometry: parsed.data.geometry ?? null,
    side: parsed.data.side ?? null,
    region: parsed.data.region ?? null,
    reference: parsed.data.reference,
    screwInfo: parsed.data.screwInfo ?? null,
    notes: parsed.data.notes ?? null,
    active: parsed.data.active ?? true,
  }).returning();

  res.status(201).json(toEntryResponse(entry));
});

// Update catalogue entry
router.patch("/plate-catalog/:entryId", async (req, res): Promise<void> => {
  const params = UpdatePlateCatalogEntryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdatePlateCatalogEntryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updateData: Record<string, unknown> = {};
  const d = parsed.data;
  if (d.manufacturer !== undefined) updateData.manufacturer = d.manufacturer;
  if (d.system !== undefined) updateData.system = d.system;
  if (d.plateType !== undefined) updateData.plateType = d.plateType;
  if (d.geometry !== undefined) updateData.geometry = d.geometry;
  if (d.side !== undefined) updateData.side = d.side;
  if (d.region !== undefined) updateData.region = d.region;
  if (d.reference !== undefined) updateData.reference = d.reference;
  if (d.screwInfo !== undefined) updateData.screwInfo = d.screwInfo;
  if (d.notes !== undefined) updateData.notes = d.notes;
  if (d.active !== undefined) updateData.active = d.active;

  const [entry] = await db
    .update(plateCatalogTable)
    .set(updateData)
    .where(eq(plateCatalogTable.id, params.data.entryId))
    .returning();

  if (!entry) { res.status(404).json({ error: "Entry not found" }); return; }
  res.json(toEntryResponse(entry));
});

// Delete catalogue entry
router.delete("/plate-catalog/:entryId", async (req, res): Promise<void> => {
  const params = DeletePlateCatalogEntryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [deleted] = await db
    .delete(plateCatalogTable)
    .where(eq(plateCatalogTable.id, params.data.entryId))
    .returning();

  if (!deleted) { res.status(404).json({ error: "Entry not found" }); return; }
  res.sendStatus(204);
});

export default router;
