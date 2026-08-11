import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const planningImagesTable = pgTable("planning_images", {
  id: serial("id").primaryKey(),
  protocolId: integer("protocol_id").notNull(),
  objectPath: text("object_path").notNull(),
  servingUrl: text("serving_url").notNull(),
  originalName: text("original_name"),
  caption: text("caption"),
  category: text("category").notNull().default("outros"),
  phase: text("phase"),
  captureDate: text("capture_date"),
  isHeaderPhoto: boolean("is_header_photo").notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  includeInPdf: boolean("include_in_pdf").notNull().default(true),
  // IA — fluxo de análise (classificação sugerida vs. confirmação humana)
  aiClassification: text("ai_classification"),
  aiClassificationReason: text("ai_classification_reason"),
  isFinalMeasurement: boolean("is_final_measurement"),
  selectedForExtraction: boolean("selected_for_extraction").notNull().default(false),
  contentHash: text("content_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPlanningImageSchema = createInsertSchema(planningImagesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlanningImage = z.infer<typeof insertPlanningImageSchema>;
export type PlanningImage = typeof planningImagesTable.$inferSelect;
