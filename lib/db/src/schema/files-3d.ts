import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * 3D clinical files (STL / PLY) attached to a patient's process — intraoral
 * scans, dental models, maxilla/mandible/skull models, splints, surgical
 * guides and other files. The binary lives in object storage; this row holds
 * the identification metadata.
 */
export const files3dTable = pgTable("files_3d", {
  id: serial("id").primaryKey(),
  protocolId: integer("protocol_id").notNull(),
  objectPath: text("object_path").notNull(),
  servingUrl: text("serving_url").notNull(),
  originalName: text("original_name"),
  fileFormat: text("file_format").notNull().default("stl"), // stl | ply
  fileType: text("file_type").notNull().default("outro"), // scanner_intraoral | modelo_dentario | maxila | mandibula | cranio | splint | guia_cirurgica | outro
  origin: text("origin"),
  fileDate: text("file_date"),
  version: text("version"),
  notes: text("notes"),
  displayOrder: integer("display_order").notNull().default(0),
  includeInPdf: boolean("include_in_pdf").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFile3dSchema = createInsertSchema(files3dTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFile3d = z.infer<typeof insertFile3dSchema>;
export type File3d = typeof files3dTable.$inferSelect;
