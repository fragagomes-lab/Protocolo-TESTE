import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, templatesTable } from "@workspace/db";
import {
  CreateTemplateBody,
  GetTemplateParams,
  UpdateTemplateParams,
  UpdateTemplateBody,
  DeleteTemplateParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/templates", async (_req, res): Promise<void> => {
  const templates = await db.select().from(templatesTable).orderBy(desc(templatesTable.updatedAt));
  res.json(templates.map(toTemplateResponse));
});

router.post("/templates", async (req, res): Promise<void> => {
  const parsed = CreateTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [template] = await db.insert(templatesTable).values({
    name: parsed.data.name,
    surgeryType: parsed.data.surgeryType,
    description: parsed.data.description ?? "",
    checklist: parsed.data.checklist ?? null,
    surgicalPlan: parsed.data.surgicalPlan ?? null,
    surgicalSequence: parsed.data.surgicalSequence ?? null,
    isDefault: parsed.data.isDefault ?? false,
  }).returning();

  res.status(201).json(toTemplateResponse(template));
});

router.get("/templates/:id", async (req, res): Promise<void> => {
  const params = GetTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [template] = await db.select().from(templatesTable).where(eq(templatesTable.id, params.data.id));
  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  res.json(toTemplateResponse(template));
});

router.patch("/templates/:id", async (req, res): Promise<void> => {
  const params = UpdateTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  const data = parsed.data;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.surgeryType !== undefined) updateData.surgeryType = data.surgeryType;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.checklist !== undefined) updateData.checklist = data.checklist;
  if (data.surgicalPlan !== undefined) updateData.surgicalPlan = data.surgicalPlan;
  if (data.surgicalSequence !== undefined) updateData.surgicalSequence = data.surgicalSequence;
  if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

  const [template] = await db
    .update(templatesTable)
    .set(updateData)
    .where(eq(templatesTable.id, params.data.id))
    .returning();

  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  res.json(toTemplateResponse(template));
});

router.delete("/templates/:id", async (req, res): Promise<void> => {
  const params = DeleteTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db.delete(templatesTable).where(eq(templatesTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  res.sendStatus(204);
});

function toTemplateResponse(t: typeof templatesTable.$inferSelect) {
  return {
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export default router;
