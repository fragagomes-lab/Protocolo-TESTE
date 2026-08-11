/**
 * Updates the example protocol CDF-2024-001 (Maria Silva) to use the enriched
 * osteosynthesis plate schema (plateType enum, anatomicalZone, reference, lot,
 * embedded screws array, drills, saws) instead of the old flat format.
 *
 * Idempotent: run any number of times — it overwrites only the `materials`
 * column of the existing CDF-2024-001 row.
 *
 * Run with:
 *   pnpm --filter @workspace/db tsx src/seed-cdf-materials.ts
 */
import { pathToFileURL } from "node:url";
import { db } from "./index";
import { protocolsTable } from "./schema";
import { eq } from "drizzle-orm";

const CDF_PROCESS = "CDF-2024-001";

/**
 * Enriched materials for CDF-2024-001 — Cirurgia Bimaxilar
 * (LeFort I avanço 2mm + impacção 3mm; BSSO avanço mandibular 6mm).
 * Faithful to the original protocol data (Stryker / Leibinger 2.0, 4 placas em
 * L na maxila, fixação mandibular com parafusos bicorticais posicionais),
 * migrated to the enriched PlateRecord / ScrewRecord schema.
 */
export const cdfMaterials = {
  plates: [
    {
      plateType: "L_right_4h",
      brand: "Stryker",
      system: "2.0mm",
      reference: "52-24051",
      lot: "STR2024A",
      anatomicalZone: "pilar_canino_dir",
      side: "right",
      location: "Pilar canino direito — maxila",
      quantity: 1,
      notes: "LeFort I — fixação anterior direita (Leibinger 2.0)",
      screws: [
        { screwType: "monocortical", selfTapping: true, diameter: "2.0", length: 5, quantity: 4, reference: "52-20005", lot: "STR2024S", location: "Pilar canino dir" },
      ],
      type: "L 4 furos",
      screwCount: 4,
      screwSize: "2.0x5mm",
    },
    {
      plateType: "L_left_4h",
      brand: "Stryker",
      system: "2.0mm",
      reference: "52-24051",
      lot: "STR2024A",
      anatomicalZone: "pilar_canino_esq",
      side: "left",
      location: "Pilar canino esquerdo — maxila",
      quantity: 1,
      notes: "LeFort I — fixação anterior esquerda (Leibinger 2.0)",
      screws: [
        { screwType: "monocortical", selfTapping: true, diameter: "2.0", length: 5, quantity: 4, reference: "52-20005", lot: "STR2024S", location: "Pilar canino esq" },
      ],
      type: "L 4 furos",
      screwCount: 4,
      screwSize: "2.0x5mm",
    },
    {
      plateType: "L_right_6h",
      brand: "Stryker",
      system: "2.0mm",
      reference: "52-24061",
      lot: "STR2024A",
      anatomicalZone: "pilar_zigomatico_dir",
      side: "right",
      location: "Pilar zigomático direito — maxila",
      quantity: 1,
      notes: "LeFort I — fixação posterior direita (Leibinger 2.0)",
      screws: [
        { screwType: "monocortical", selfTapping: true, diameter: "2.0", length: 7, quantity: 6, reference: "52-20007", lot: "STR2024S", location: "Pilar zigomático dir" },
      ],
      type: "L 6 furos",
      screwCount: 6,
      screwSize: "2.0x7mm",
    },
    {
      plateType: "L_left_6h",
      brand: "Stryker",
      system: "2.0mm",
      reference: "52-24061",
      lot: "STR2024A",
      anatomicalZone: "pilar_zigomatico_esq",
      side: "left",
      location: "Pilar zigomático esquerdo — maxila",
      quantity: 1,
      notes: "LeFort I — fixação posterior esquerda (Leibinger 2.0)",
      screws: [
        { screwType: "monocortical", selfTapping: true, diameter: "2.0", length: 7, quantity: 6, reference: "52-20007", lot: "STR2024S", location: "Pilar zigomático esq" },
      ],
      type: "L 6 furos",
      screwCount: 6,
      screwSize: "2.0x7mm",
    },
  ],
  additionalScrews: [
    { screwType: "positional", selfTapping: true, diameter: "2.0", length: 14, quantity: 3, reference: "52-20014", lot: "STR2024B", location: "Ramo mandibular direito — BSSO bicortical" },
    { screwType: "positional", selfTapping: true, diameter: "2.0", length: 14, quantity: 3, reference: "52-20014", lot: "STR2024B", location: "Ramo mandibular esquerdo — BSSO bicortical" },
  ],
  drills: [
    { brand: "Stryker", diameter: "1.5", drillType: "twist", reference: "52-15DR", usedCount: 2 },
    { brand: "Stryker", diameter: "2.0", drillType: "twist", reference: "52-20DR", usedCount: 4 },
  ],
  saws: [
    { brand: "Stryker", sawType: "oscillating", bladeRef: "52-OSC-30", usedCount: 1 },
    { brand: "Stryker", sawType: "sagittal", bladeRef: "52-SAG-22", usedCount: 1 },
  ],
  otherMaterials: [
    { name: "Splint intermaxilar cirúrgico", quantity: 1, notes: "Verificação da oclusão planeada" },
    { name: "Fio de aço 0.4mm", quantity: 1, notes: "Ligadura intermaxilar transitória" },
  ],
};

async function seedCdfMaterials() {
  console.log(`🌱 Updating ${CDF_PROCESS} materials to enriched schema...`);

  const updated = await db
    .update(protocolsTable)
    .set({ materials: cdfMaterials as any })
    .where(eq(protocolsTable.processNumber, CDF_PROCESS))
    .returning({ id: protocolsTable.id });

  if (updated.length === 0) {
    console.warn(`⚠️  No protocol found with process_number=${CDF_PROCESS}; nothing updated.`);
    process.exit(0);
  }

  // Deterministic verification that the enriched schema is in place.
  const [row] = await db
    .select({ materials: protocolsTable.materials })
    .from(protocolsTable)
    .where(eq(protocolsTable.processNumber, CDF_PROCESS));

  const mats = row.materials as typeof cdfMaterials;
  const okPlates =
    Array.isArray(mats.plates) &&
    mats.plates.length === 4 &&
    mats.plates.every(
      (p) =>
        typeof p.plateType === "string" &&
        p.plateType.length > 0 &&
        typeof p.anatomicalZone === "string" &&
        p.anatomicalZone.length > 0 &&
        Array.isArray(p.screws) &&
        p.screws.length > 0,
    );

  if (!okPlates) {
    console.error("❌ Verification failed: plates do not conform to the enriched schema.");
    process.exit(1);
  }

  console.log(
    `✅ ${CDF_PROCESS} (id=${updated[0].id}) updated: ${mats.plates.length} plates, ` +
      `${mats.additionalScrews.length} additional screws, ${mats.drills.length} drills, ${mats.saws.length} saws.`,
  );
  process.exit(0);
}

// Only auto-run when executed directly (e.g. `tsx src/seed-cdf-materials.ts`),
// so other seed scripts can import `cdfMaterials` without triggering the update.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedCdfMaterials().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
