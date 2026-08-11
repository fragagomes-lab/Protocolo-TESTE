/**
 * Seeds the DEMO protocol — run with:
 *   pnpm --filter @workspace/db tsx src/seed-demo.ts
 */
import { db } from "./index";
import { protocolsTable } from "./schema";
import { eq } from "drizzle-orm";

const DEMO_PROCESS = "DEMO-2024-001";

const demoMaterials = {
  plates: [
    {
      plateType: "L_left_4h",
      brand: "KLS Martin",
      system: "2.0mm",
      reference: "21-800-04-11",
      lot: "KLS2024A",
      anatomicalZone: "pilar_canino_esq",
      side: "left",
      location: "Pilar canino esquerdo — maxila",
      quantity: 1,
      notes: "LeFort I — fixação anterior esquerda",
      screws: [
        { screwType: "monocortical", selfTapping: true, diameter: "2.0", length: 5, quantity: 4, reference: "21-800-07-05", lot: "KLS2024B", location: "Pilar canino esq" }
      ],
      type: "L 4 furos",
      screwCount: 4,
      screwSize: "2.0x5mm",
    },
    {
      plateType: "L_right_4h",
      brand: "KLS Martin",
      system: "2.0mm",
      reference: "21-800-04-12",
      lot: "KLS2024A",
      anatomicalZone: "pilar_canino_dir",
      side: "right",
      location: "Pilar canino direito — maxila",
      quantity: 1,
      notes: "LeFort I — fixação anterior direita",
      screws: [
        { screwType: "monocortical", selfTapping: true, diameter: "2.0", length: 5, quantity: 4, reference: "21-800-07-05", lot: "KLS2024B", location: "Pilar canino dir" }
      ],
      type: "L 4 furos",
      screwCount: 4,
      screwSize: "2.0x5mm",
    },
    {
      plateType: "L_left_6h",
      brand: "KLS Martin",
      system: "2.0mm",
      reference: "21-800-06-11",
      lot: "KLS2024A",
      anatomicalZone: "pilar_zigomatico_esq",
      side: "left",
      location: "Pilar zigomático esquerdo — maxila",
      quantity: 1,
      notes: "LeFort I — fixação posterior esquerda",
      screws: [
        { screwType: "monocortical", selfTapping: true, diameter: "2.0", length: 7, quantity: 4, reference: "21-800-07-07", lot: "KLS2024B", location: "Pilar zigomático esq" }
      ],
      type: "L 6 furos",
      screwCount: 4,
      screwSize: "2.0x7mm",
    },
    {
      plateType: "L_right_6h",
      brand: "KLS Martin",
      system: "2.0mm",
      reference: "21-800-06-12",
      lot: "KLS2024A",
      anatomicalZone: "pilar_zigomatico_dir",
      side: "right",
      location: "Pilar zigomático direito — maxila",
      quantity: 1,
      notes: "LeFort I — fixação posterior direita",
      screws: [
        { screwType: "monocortical", selfTapping: true, diameter: "2.0", length: 7, quantity: 4, reference: "21-800-07-07", lot: "KLS2024B", location: "Pilar zigomático dir" }
      ],
      type: "L 6 furos",
      screwCount: 4,
      screwSize: "2.0x7mm",
    },
    {
      plateType: "BSSO_right",
      brand: "KLS Martin",
      system: "2.0mm",
      reference: "21-850-BSSO-R",
      lot: "KLS2024C",
      anatomicalZone: "bordo_inf_dir",
      side: "right",
      location: "Ramo mandibular direito — BSSO",
      quantity: 1,
      notes: "Fixação BSSO direito — parafusos posicionais",
      screws: [
        { screwType: "positional", selfTapping: true, diameter: "2.0", length: 14, quantity: 3, reference: "21-850-07-14", lot: "KLS2024C", location: "Ramo mandibular dir bicortical" }
      ],
      type: "Placa BSSO",
      screwCount: 3,
      screwSize: "2.0x14mm",
    },
    {
      plateType: "BSSO_left",
      brand: "KLS Martin",
      system: "2.0mm",
      reference: "21-850-BSSO-L",
      lot: "KLS2024C",
      anatomicalZone: "bordo_inf_esq",
      side: "left",
      location: "Ramo mandibular esquerdo — BSSO",
      quantity: 1,
      notes: "Fixação BSSO esquerdo — parafusos posicionais",
      screws: [
        { screwType: "positional", selfTapping: true, diameter: "2.0", length: 14, quantity: 3, reference: "21-850-07-14", lot: "KLS2024C", location: "Ramo mandibular esq bicortical" }
      ],
      type: "Placa BSSO",
      screwCount: 3,
      screwSize: "2.0x14mm",
    },
    {
      plateType: "chin",
      brand: "KLS Martin",
      system: "2.0mm",
      reference: "21-870-CHIN",
      lot: "KLS2024D",
      anatomicalZone: "mento",
      side: "central",
      location: "Mento — mentoplastia",
      quantity: 1,
      notes: "Placa de mento — avanço 5mm",
      screws: [
        { screwType: "monocortical", selfTapping: true, diameter: "2.0", length: 5, quantity: 4, reference: "21-800-07-05", lot: "KLS2024B", location: "Mento inf" },
        { screwType: "monocortical", selfTapping: true, diameter: "2.0", length: 5, quantity: 2, reference: "21-800-07-05", lot: "KLS2024B", location: "Mento sup" }
      ],
      type: "Placa de mento",
      screwCount: 6,
      screwSize: "2.0x5mm",
    },
  ],
  additionalScrews: [],
  drills: [
    { brand: "KLS Martin", diameter: "1.5", drillType: "twist", reference: "28-145-02-15", usedCount: 2 },
    { brand: "KLS Martin", diameter: "2.0", drillType: "twist", reference: "28-145-02-20", usedCount: 4 },
  ],
  saws: [
    { brand: "KLS Martin", sawType: "oscillating", bladeRef: "28-820-SAW-30", usedCount: 1 },
    { brand: "KLS Martin", sawType: "sagittal", bladeRef: "28-821-SAG-22", usedCount: 1 },
  ],
  otherMaterials: [
    { name: "Splint intermaxilar cirúrgico", quantity: 1, notes: "Confeccionado em laboratório a partir de modelos digitais" },
    { name: "Fio de aço 0.4mm", quantity: 1, notes: "Ligadura intermaxilar transitória durante fixação" },
  ],
};

const demoChecklist = [
  { item: "Estudo radiológico completo (OPG + telerradiografia lateral)", status: "ok" },
  { item: "CBCT pré-cirúrgico realizado e analisado", status: "ok" },
  { item: "Modelos de estudo montados em articulador", status: "ok" },
  { item: "Planeamento virtual 3D aprovado pelo cirurgião", status: "ok" },
  { item: "Splint(s) cirúrgico(s) confeccionados e verificados", status: "ok" },
  { item: "Análise cefalométrica e predição de resultados", status: "ok" },
  { item: "Consentimento informado assinado pelo doente", status: "ok" },
  { item: "Avaliação anestésica pré-operatória realizada", status: "ok" },
  { item: "Análises laboratoriais e ECG dentro dos parâmetros", status: "ok" },
  { item: "Jejum confirmado (≥ 6h sólidos, ≥ 2h líquidos)", status: "ok" },
  { item: "Antibiótico profiláctico prescrito e administrado", status: "ok" },
  { item: "Material de osteossíntese verificado e esterilizado", status: "ok" },
  { item: "Ortodontista notificado da data cirúrgica", status: "ok" },
  { item: "Braquetes com arcos de aço ajustados (sem cinching)", status: "ok" },
];

const demoProtocol = {
  processNumber: DEMO_PROCESS,
  patientName: "João Exemplo Silva",
  patientDOB: "1996-03-15",
  patientAge: 28,
  patientGender: "M",
  surgeryDate: "2024-12-10",
  surgeryType: "Cirurgia Ortognática Bimaxilar",
  status: "finalized",
  team: {
    surgeon: "Dr. Matos da Fonseca",
    firstAssistant: "Dra. Ana Ferreira",
    secondAssistant: "Dr. Carlos Sousa",
    instrumentist: "Enf. Sofia Rodrigues",
    anesthesiologist: "Dr. Paulo Neves",
    scrubNurse: "Enf. Carla Pinto",
  },
  checklist: demoChecklist,
  preopDiagnosis: {
    skeletalClass: "III",
    verticalPattern: "hyperdivergent",
    maxillaryPosition: "Deficiência maxilar sagital e vertical",
    mandibularPosition: "Prognatismo mandibular",
    facialAsymmetry: false,
    openBite: false,
    crossBite: false,
    overjet: -5,
    overbite: 1,
    airwayCompromise: false,
    tmjSymptoms: false,
    additionalNotes:
      "⚠️ FICHA DE DEMONSTRAÇÃO — DADOS TOTALMENTE FICTÍCIOS\n\nClasse III esquelética com deficiência maxilar (hipoplasia maxilar sagital e vertical) e prognatismo mandibular. Padrão hiperdivergente. Terço inferior aumentado. Indicação para cirurgia bimaxilar: LeFort I de avanço maxilar 4mm + impacção 2mm, BSSO de recuo mandibular 3mm, e mentoplastia de avanço 5mm.",
  },
  surgicalPlan: {
    maxilla: {
      included: true,
      osteotomyType: "LeFort_I",
      segments: [
        {
          segment: "total",
          movements: { sagittal: 4, vertical: -2, transverseLeft: null, transverseRight: null, rotation: null },
        },
      ],
      bonGraft: false,
      fixation: "Placas em L (2.0mm) + parafusos monocorticais auto-perfurantes",
      notes: "LeFort I — avanço 4mm + impacção 2mm. Fixação com 4 placas em L.",
    },
    mandible: {
      included: true,
      osteotomyType: "BSSO",
      movements: { sagittal: -3, vertical: null, transverseLeft: null, transverseRight: null, rotation: null },
      rigidFixation: true,
      fixationType: "Parafusos bicorticais posicionais 2.0x14mm (3 por lado)",
      condylarPositioning: "splint",
      notes: "BSSO — recuo mandibular 3mm. Posicionamento condilar por goteira.",
    },
    chin: {
      included: true,
      procedure: "advancement",
      movements: { sagittal: 5, vertical: 0, transverseLeft: null, transverseRight: null, rotation: null },
      notes: "Mentoplastia de avanço 5mm. Fixação com placa de mento KLS Martin 2.0mm.",
    },
    associated: [],
  },
  surgicalSequence: [
    { order: 1, description: "Entubação naso-traqueal e posicionamento em decúbito dorsal ligeiramente elevado", startTime: "08:00", endTime: "08:20" },
    { order: 2, description: "LeFort I: incisão vestibular, descolamento subperiósteo, osteotomia com serra + cinzéis, mobilização com fórceps de Tessier", startTime: "08:25", endTime: "09:40" },
    { order: 3, description: "Reposicionamento maxilar com splint intermaxilar, verificação da oclusão, fixação com 4 placas em L KLS Martin 2.0mm", startTime: "09:40", endTime: "10:20" },
    { order: 4, description: "BSSO bilateral: incisão, osteotomia sagital do ramo mandibular, recuo 3mm, fixação com 3 parafusos posicionais bicorticais por lado", startTime: "10:25", endTime: "11:55" },
    { order: 5, description: "Mentoplastia: incisão, osteotomia horizontal, avanço 5mm, fixação com placa de mento. Sutura em camadas.", startTime: "12:00", endTime: "12:35" },
    { order: 6, description: "Sutura por planos com Vicryl 3-0 e Monocryl 4-0. Penso facial compressivo.", startTime: "12:35", endTime: "13:10" },
  ],
  intraopRecord: {
    anesthesiaStartTime: "07:45",
    anesthesiaEndTime: "13:30",
    surgeryStartTime: "08:25",
    surgeryEndTime: "13:10",
    estimatedBloodLoss: 220,
    fluidAdministered: 1800,
    complications: [],
    generalNotes:
      "Cirurgia sem intercorrências. Movimentos ósseos conforme planeamento virtual. Oclusão estável no final. Condições favoráveis em todo o acto cirúrgico.",
  },
  materials: demoMaterials,
  operativeDescription: `Cirurgia Ortognática Bimaxilar com Mentoplastia
Data: 10 de Dezembro de 2024 | Processo: DEMO-2024-001
⚠️ DEMONSTRAÇÃO — DADOS FICTÍCIOS

Após indução anestésica e entubação naso-traqueal, procedeu-se ao posicionamento e preparação do campo cirúrgico. Administração de dexametasona 8mg IV e cefazolina 2g IV profilática.

MAXILA — LeFort I:
Realizou-se incisão vestibular maxilar desde a tuberosidade direita à tuberosidade esquerda. Efectuou-se descolamento subperiósteo bilateral expondo os pilares caninos, zigomáticos e o soalho nasal. Procedeu-se à osteotomia horizontal LeFort I com serra oscilante KLS Martin, seguida de osteotomias pterigomaxilares bilaterais com cinzel curvo. A maxila foi mobilizada com fórceps de Rowe-Killey. Interposição do splint intermaxilar e ligaduras em arco para verificação da oclusão planeada. Avanço maxilar de 4mm e impacção de 2mm confirmados. Fixação rígida com 4 placas em L KLS Martin 2.0mm (2 pilares caninos + 2 pilares zigomáticos), totalizando 16 parafusos monocorticais auto-perfurantes 2.0x5mm (pilares caninos) e 2.0x7mm (pilares zigomáticos). Irrigação e sutura da mucosa com Vicryl 3-0.

MANDÍBULA — BSSO Bilateral:
Incisão intra-oral na região do ramo ascendente bilateral. Descolamento subperiósteo e exposição do ramo. Osteotomia sagital bilateral do ramo mandibular segundo técnica de Dal Pont-Hunsuck. Clivagem cuidadosa dos segmentos com preservação do nervo alveolar inferior (verificado bilateralmente). Recuo mandibular de 3mm com posicionamento por splint. Fixação rígida com 3 parafusos posicionais bicorticais KLS Martin 2.0x14mm por lado (total 6 parafusos). Verificação da oclusão e estabilidade condilar. Sutura com Vicryl 3-0.

MENTO — Mentoplastia:
Incisão vestibular na região do mento. Descolamento subperiósteo anterior com preservação dos nervos mentonianos bilaterais. Osteotomia horizontal com serra oscilante. Avanço do segmento mentoniano de 5mm. Fixação com placa de mento KLS Martin 2.0mm (6 parafusos monocorticais 2.0x5mm). Sutura em 2 planos com Vicryl 3-0 e Monocryl 4-0 intradérmico.

Penso facial compressivo elástico. Sem intercorrências. Oclusão estável e satisfatória no final do acto cirúrgico.`,
  postopNotes: `Internamento pós-operatório D0–D2.
Alta hospitalar ao 2º dia pós-operatório (D+2), sem complicações imediatas.
Prescrição: antibioterapia (amoxicilina + ácido clavulânico 875/125mg 8/8h, 7 dias), corticoterapia (prednisolona 40mg 1x/dia, 5 dias em desmame), anti-inflamatório (ibuprofeno 600mg 8/8h com refeições, 5 dias), analgesia (paracetamol 1g 6/6h SOS).
Fisioterapia facial a iniciar D+3.
Primeira consulta de revisão: D+7.
Ligaduras elásticas guia a colocar pelo ortodontista na consulta de D+7.
Dieta líquida/pastosa nas primeiras 6 semanas.`,
};

async function seedDemo() {
  console.log("🌱 Seeding DEMO protocol...");

  // Remove existing demo if present
  await db.delete(protocolsTable).where(eq(protocolsTable.processNumber, DEMO_PROCESS));

  const [inserted] = await db
    .insert(protocolsTable)
    .values(demoProtocol as any)
    .returning({ id: protocolsTable.id });

  console.log(`✅ Demo protocol inserted with id=${inserted.id} (process=${DEMO_PROCESS})`);
  process.exit(0);
}

seedDemo().catch((e) => { console.error(e); process.exit(1); });
