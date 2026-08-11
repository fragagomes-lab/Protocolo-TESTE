import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, phrasesTable } from "@workspace/db";
import {
  ListPhrasesQueryParams,
  CreatePhraseBody,
  UpdatePhraseParams,
  UpdatePhraseBody,
  DeletePhraseParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/phrases", async (req, res): Promise<void> => {
  const parsed = ListPhrasesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const query = db.select().from(phrasesTable).orderBy(phrasesTable.category, desc(phrasesTable.updatedAt));
  const phrases = parsed.data.category
    ? await query.where(eq(phrasesTable.category, parsed.data.category))
    : await query;

  res.json(phrases.map(toPhraseResponse));
});

router.post("/phrases", async (req, res): Promise<void> => {
  const parsed = CreatePhraseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [phrase] = await db.insert(phrasesTable).values({
    category: parsed.data.category,
    subcategory: parsed.data.subcategory ?? "",
    text: parsed.data.text,
    isCustom: parsed.data.isCustom ?? true,
  }).returning();

  res.status(201).json(toPhraseResponse(phrase));
});

router.patch("/phrases/:id", async (req, res): Promise<void> => {
  const params = UpdatePhraseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePhraseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  const data = parsed.data;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.subcategory !== undefined) updateData.subcategory = data.subcategory;
  if (data.text !== undefined) updateData.text = data.text;

  const [phrase] = await db
    .update(phrasesTable)
    .set(updateData)
    .where(eq(phrasesTable.id, params.data.id))
    .returning();

  if (!phrase) {
    res.status(404).json({ error: "Phrase not found" });
    return;
  }

  res.json(toPhraseResponse(phrase));
});

router.delete("/phrases/:id", async (req, res): Promise<void> => {
  const params = DeletePhraseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db.delete(phrasesTable).where(eq(phrasesTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Phrase not found" });
    return;
  }

  res.sendStatus(204);
});

function toPhraseResponse(p: typeof phrasesTable.$inferSelect) {
  return {
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export default router;
