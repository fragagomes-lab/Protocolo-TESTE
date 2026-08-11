/**
 * Seeds the example protocol CDF-2024-001 (Maria Silva) — run with:
 *   pnpm --filter @workspace/db tsx src/seed-cdf.ts
 *
 * Idempotent: deletes any existing CDF-2024-001 row (by process_number) and
 * re-inserts it, following the seed-demo pattern. Uses the enriched
 * osteosynthesis `materials` schema shared with seed-cdf-materials.ts, so both
 * example protocols (DEMO-2024-001 and CDF-2024-001) can be regenerated from
 * code and survive a database reset.
 */
import { db } from "./index";
import { protocolsTable } from "./schema";
import { eq } from "drizzle-orm";
import { cdfMaterials } from "./seed-cdf-materials";

const CDF_PROCESS = "CDF-2024-001";

const cdfChecklist = [
  { item: "Exames analíticos", status: "ok" },
  { item: "ECG", status: "ok" },
  { item: "Autorização anestésica", status: "ok" },
  { item: "Modelos de estudo", status: "ok" },
  { item: "Cefalometria pré-op", status: "ok" },
  { item: "Placas e parafusos confirmados", status: "ok" },
  { item: "Consentimento informado assinado", status: "ok" },
  { item: "Jejum confirmado", status: "ok" },
];

const cdfProtocol = {
  processNumber: CDF_PROCESS,
  patientName: "Maria Silva",
  patientDOB: "1992-03-15",
  patientAge: 32,
  patientGender: "F",
  surgeryDate: "2024-11-20",
  surgeryType: "Cirurgia Bimaxilar",
  status: "finalized",
  team: {
    surgeon: "Dr. Matos da Fonseca",
    firstAssistant: "Dr. Ana Ferreira",
    secondAssistant: "Dr. João Costa",
    instrumentist: "Enf. Sofia Rodrigues",
    anesthesiologist: "Dr. Paulo Neves",
    scrubNurse: "Enf. Carla Pinto",
  },
  checklist: cdfChecklist,
  preopDiagnosis: {
    skeletalClass: "III",
    verticalPattern: "hyperdivergent",
    facialAsymmetry: false,
    openBite: false,
    crossBite: false,
    overjet: -4,
    overbite: -2,
    airwayCompromise: false,
    tmjSymptoms: false,
    additionalNotes:
      "Padrão hiperdivergente com retrognatia mandibular relativa e prognatia maxilar.",
  },
  surgicalPlan: {
    chin: { included: false },
    maxilla: {
      included: true,
      osteotomyType: "LeFort_I",
      segments: [
        {
          segment: "total",
          movements: { sagittal: 2, vertical: -3, transverseLeft: null, transverseRight: null, rotation: null },
        },
      ],
      bonGraft: false,
      fixation: "Placas de titânio",
    },
    mandible: {
      included: true,
      osteotomyType: "BSSO",
      movements: { sagittal: 6, vertical: null, transverseLeft: null, transverseRight: null, rotation: null },
      rigidFixation: true,
      fixationType: "Parafusos bicorticais",
    },
    associated: [],
  },
  surgicalSequence: [
    { order: 1, description: "Entubação naso-traqueal", startTime: "08:15", endTime: "08:30" },
    { order: 2, description: "Osteotomia LeFort I", startTime: "08:35", endTime: "09:20" },
    { order: 3, description: "Fixação maxilar", startTime: "09:20", endTime: "09:50" },
    { order: 4, description: "BSSO bilateral", startTime: "09:55", endTime: "11:10" },
    { order: 5, description: "Fixação mandibular e sutura", startTime: "11:10", endTime: "11:45" },
  ],
  intraopRecord: {
    anesthesiaStartTime: "08:00",
    anesthesiaEndTime: "12:00",
    surgeryStartTime: "08:15",
    surgeryEndTime: "11:45",
    estimatedBloodLoss: 180,
    fluidAdministered: 1500,
    complications: [],
    generalNotes: "Cirurgia decorreu sem intercorrências.",
  },
  materials: cdfMaterials,
  operativeDescription:
    "Cirurgia bimaxilar realizada sob anestesia geral sem intercorrências. LeFort I com impactação de 3mm e avanço de 2mm. BSSO com avanço mandibular de 6mm. Fixação com placas Stryker Leibinger 2.0.",
  postopNotes: "Alta hospitalar D+2. Sem complicações pós-operatórias imediatas.",
};

async function seedCdf() {
  console.log(`🌱 Seeding ${CDF_PROCESS} protocol...`);

  // Remove existing row if present (idempotent, by process_number).
  await db.delete(protocolsTable).where(eq(protocolsTable.processNumber, CDF_PROCESS));

  const [inserted] = await db
    .insert(protocolsTable)
    .values(cdfProtocol as any)
    .returning({ id: protocolsTable.id });

  console.log(`✅ CDF protocol inserted with id=${inserted.id} (process=${CDF_PROCESS})`);
  process.exit(0);
}

seedCdf().catch((e) => {
  console.error(e);
  process.exit(1);
});
