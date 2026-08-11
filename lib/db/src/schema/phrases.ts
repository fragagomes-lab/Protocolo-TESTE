import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const phrasesTable = pgTable("phrases", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  subcategory: text("subcategory").default(""),
  text: text("text").notNull(),
  isCustom: boolean("is_custom").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPhraseSchema = createInsertSchema(phrasesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPhrase = z.infer<typeof insertPhraseSchema>;
export type Phrase = typeof phrasesTable.$inferSelect;
