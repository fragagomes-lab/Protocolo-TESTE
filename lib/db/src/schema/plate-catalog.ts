import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Configurable osteosynthesis plate catalogue keyed by manufacturer
 * (Osteomed, DELPHOS, or other). Entries are user-created / user-confirmed
 * commercial references — we never seed invented reference numbers. The plate
 * editor reads from this table to offer cascading selection, and users can add
 * new references here as they confirm them.
 */
export const plateCatalogTable = pgTable("plate_catalog", {
  id: serial("id").primaryKey(),
  manufacturer: text("manufacturer").notNull(), // osteomed | delphos | outro
  system: text("system"), // e.g. 1.5mm / 2.0mm / 2.4mm
  plateType: text("plate_type"), // L / reta / BSSO / quadrada / orbitaria / mento / custom
  geometry: text("geometry"), // free text describing hole count / shape
  side: text("side"), // right | left | bilateral | central
  region: text("region"), // anatomical region label
  reference: text("reference").notNull(), // commercial reference (user-confirmed)
  screwInfo: text("screw_info"), // associated screws description
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPlateCatalogSchema = createInsertSchema(plateCatalogTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlateCatalog = z.infer<typeof insertPlateCatalogSchema>;
export type PlateCatalog = typeof plateCatalogTable.$inferSelect;
