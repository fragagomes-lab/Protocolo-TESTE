import { pgTable, serial, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const protocolsTable = pgTable("protocols", {
  id: serial("id").primaryKey(),
  processNumber: text("process_number").notNull(),
  patientName: text("patient_name").notNull(),
  patientDOB: text("patient_dob"),
  patientAge: integer("patient_age"),
  patientGender: text("patient_gender"),
  surgeryDate: text("surgery_date"),
  surgeryType: text("surgery_type").notNull().default(""),
  status: text("status").notNull().default("draft"),
  // JSONB columns for complex nested data
  team: jsonb("team"),
  checklist: jsonb("checklist"),
  preopDiagnosis: jsonb("preop_diagnosis"),
  surgicalPlan: jsonb("surgical_plan"),
  surgicalSequence: jsonb("surgical_sequence"),
  intraopRecord: jsonb("intraop_record"),
  materials: jsonb("materials"),
  piezoEquipment: jsonb("piezo_equipment"),
  surgicalDiagrams: jsonb("surgical_diagrams"),
  planAiAnalysis: jsonb("plan_ai_analysis"),
  // Audit trail: every time a finalized protocol is reopened (un-finalized),
  // an entry { reopenedAt, reopenedBy? } is appended here by the API. Entries
  // are never removed — re-finalizing must not erase the history.
  reopenHistory: jsonb("reopen_history"),
  operativeDescription: text("operative_description").default(""),
  postopNotes: text("postop_notes").default(""),
  // Dados de internamento / Nota de Alta
  hospital: text("hospital"),
  utenteNumber: text("utente_number"),
  admissionDateTime: text("admission_date_time"),
  dischargeDateTime: text("discharge_date_time"),
  nextAppointmentDate: text("next_appointment_date"),
  nextAppointmentTime: text("next_appointment_time"),
  nextAppointmentLocation: text("next_appointment_location").default("Clínica da Face"),
  homeMedication: text("home_medication").default(""),
  postopRecommendations: text("postop_recommendations").default(""),
  // "Previsão Laboratorial" — folha estruturada pré-cirúrgica
  labPrediction: jsonb("lab_prediction"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProtocolSchema = createInsertSchema(protocolsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProtocol = z.infer<typeof insertProtocolSchema>;
export type Protocol = typeof protocolsTable.$inferSelect;
