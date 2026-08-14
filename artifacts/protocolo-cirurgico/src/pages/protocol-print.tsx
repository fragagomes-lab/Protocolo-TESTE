import { useState, useMemo } from "react";
import {
  useGetProtocol, useListPlanningImages, useListFiles3d, getListFiles3dQueryKey,
  useUpdateProtocol, useTranslateDocument, useRequestUploadUrl,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useParams, Link } from "wouter";
import { format } from "date-fns";
import logo from "@assets/clinicadaface-logo.svg";
import { Printer, ChevronLeft, AlertTriangle, Pencil, RotateCcw, Languages, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChecklistItemStatus, PlateRecord, ScrewRecord, DrillRecord, SawRecord, SurgicalPlan, OrthoMovements, Protocol, PreopDiagnosis, LabPrediction } from "@workspace/api-client-react";
import { LAB_CHECKS, checkOptionLabel } from "./form-sections/lab-prediction-section";
import { AnatomicalMapPrint } from "@/components/anatomical-map";
import { SurgicalDiagramStatic } from "@/components/surgical-diagram";
import { DIAGRAMS } from "@/components/surgical-diagrams/diagrams";
import { SignatureBlockEditor } from "@/components/signature-block";
import { resolveContentType } from "@/lib/upload-utils";
import { QRCodeSVG } from "qrcode.react";
import {
  PREP_BLOCKS,
  PREP_PRODUCTS,
  APPLIANCE_LABELS,
  SEGMENTATION_LABELS,
  INSTRUCTIONS_APP_URL,
  buildPrepContext,
  effectiveItemStatus,
  effectiveProductStatus,
  computeActivationDeadline,
  prepI18n,
  type Appliance,
  type Segmentation,
} from "@/lib/preparation";

// ─── Helpers ────────────────────────────────────────────────────────────────

const PLATE_TYPE_LABELS: Record<string, string> = {
  L_left_4h:  "L Esq. 4 Furos",
  L_right_4h: "L Dir. 4 Furos",
  L_left_6h:  "L Esq. 6 Furos",
  L_right_6h: "L Dir. 6 Furos",
  BSSO_right: "BSSO Direita",
  BSSO_left:  "BSSO Esquerda",
  square:     "Quadrada/Cruciforme",
  chin:       "Mento",
  straight:   "Reta",
  custom:     "Personalizada",
};

const SCREW_TYPE_LABELS: Record<string, string> = {
  monocortical: "Monocortical",
  bicortical:   "Bicortical",
  lag:          "Compressão",
  positional:   "Posicional",
};

const ZONE_LABELS: Record<string, string> = {
  pilar_canino_dir:    "Pilar Canino Dir.",
  pilar_canino_esq:    "Pilar Canino Esq.",
  pilar_zigomatico_dir:"Pilar Zigomático Dir.",
  pilar_zigomatico_esq:"Pilar Zigomático Esq.",
  bordo_inf_dir:       "Bordo Inf. Dir.",
  bordo_inf_esq:       "Bordo Inf. Esq.",
  bordo_ant_dir:       "Bordo Ant. Dir.",
  bordo_ant_esq:       "Bordo Ant. Esq.",
  mento:               "Mento",
  custom:              "Outro",
};

function screwSummary(screw: ScrewRecord): string {
  const parts: string[] = [];
  if (screw.quantity) parts.push(`${screw.quantity}×`);
  if (screw.diameter) parts.push(`Ø${screw.diameter}mm`);
  if (screw.length) parts.push(`×${screw.length === 0 && screw.lengthCustom ? screw.lengthCustom : screw.length}mm`);
  if (screw.screwType) parts.push(`(${SCREW_TYPE_LABELS[screw.screwType] ?? screw.screwType})`);
  if (screw.selfTapping) parts.push("AP");
  return parts.join(" ");
}

// ─── Idiomas do documento ────────────────────────────────────────────────────

type DocLang = "pt" | "en" | "es";

// Dicionário local para os cabeçalhos/labels fixos das secções principais.
// A UI da app mantém-se em português; isto traduz apenas o documento gerado.
const I18N: Record<string, Record<DocLang, string>> = {
  "doc.protocolo": { pt: "Protocolo Operatório", en: "Operative Protocol", es: "Protocolo Operatorio" },
  "doc.nota": { pt: "Nota de Alta", en: "Discharge Note", es: "Nota de Alta" },
  "doc.relatorio": { pt: "Relatório Clínico", en: "Clinical Report", es: "Informe Clínico" },
  "hdr.tagline1": { pt: "Cirurgia Ortognática", en: "Orthognathic Surgery", es: "Cirugía Ortognática" },
  "sec.identification": { pt: "Identificação do Doente", en: "Patient Identification", es: "Identificación del Paciente" },
  "sec.surgeryData": { pt: "Dados da Cirurgia / Internamento", en: "Surgery / Admission Details", es: "Datos de la Cirugía / Ingreso" },
  "sec.diagnosis": { pt: "Diagnóstico", en: "Diagnosis", es: "Diagnóstico" },
  "sec.summary": { pt: "Resumo", en: "Summary", es: "Resumen" },
  "sec.operativeReport": { pt: "Descritivo Operatório", en: "Operative Report", es: "Descripción Operatoria" },
  "sec.operativeReport.nota_bloco": { pt: "Relato Operatório", en: "Operative Report", es: "Relato Operatorio" },
  "sec.operativeReport.nota": { pt: "Cirurgia", en: "Surgery", es: "Cirugía" },
  "sec.recommendations": { pt: "Recomendações Pós-Operatórias", en: "Post-operative Recommendations", es: "Recomendaciones Postoperatorias" },
  "sec.recommendations.nota": { pt: "Recomendações", en: "Recommendations", es: "Recomendaciones" },
  "sec.homeMedication": { pt: "Medicação para Domicílio", en: "Home Medication", es: "Medicación para Domicilio" },
  "sec.nextAppointment": { pt: "Próxima Consulta", en: "Next Appointment", es: "Próxima Consulta" },
  "sec.labPrediction": { pt: "Protocolo/Execução Cirúrgica", en: "Surgical Protocol / Execution", es: "Protocolo/Ejecución Quirúrgica" },
  "sec.prepChecklist": { pt: "Checklist de Preparação", en: "Preparation Checklist", es: "Lista de Preparación" },
  "sec.patientInstructions": { pt: "Instruções ao Doente", en: "Patient Instructions", es: "Instrucciones al Paciente" },
  "prep.appliance": { pt: "Aparelho ortodôntico", en: "Orthodontic appliance", es: "Aparato de ortodoncia" },
  "prep.segmentation": { pt: "Segmentação", en: "Segmentation", es: "Segmentación" },
  "prep.deadline": { pt: "Data-limite da última ativação", en: "Deadline for final activation", es: "Fecha límite de la última activación" },
  "prep.products": { pt: "Produtos a fabricar", en: "Products to fabricate", es: "Productos a fabricar" },
  "prep.instructionsIntro": {
    pt: "Instruções pré e pós-operatórias disponíveis online — aceda através do código QR ou do link:",
    en: "Pre- and post-operative instructions available online — access via the QR code or the link:",
    es: "Instrucciones pre y postoperatorias disponibles en línea — acceda mediante el código QR o el enlace:",
  },
  "prep.status.todo": { pt: "Por fazer", en: "To do", es: "Pendiente" },
  "prep.status.done": { pt: "Feito", en: "Done", es: "Hecho" },
  "prep.status.na": { pt: "N/A", en: "N/A", es: "N/A" },
  "prep.status.na_auto": { pt: "N/A (percurso)", en: "N/A (pathway)", es: "N/A (vía clínica)" },
  "prep.pstatus.todo": { pt: "A fazer", en: "To do", es: "Pendiente" },
  "prep.pstatus.in_production": { pt: "Em produção", en: "In production", es: "En producción" },
  "prep.pstatus.printed": { pt: "Impresso", en: "Printed", es: "Impreso" },
  "prep.pstatus.verified": { pt: "Verificado", en: "Verified", es: "Verificado" },
  "col.item": { pt: "Item", en: "Item", es: "Ítem" },
  "col.status": { pt: "Estado", en: "Status", es: "Estado" },
  "col.notes": { pt: "Notas", en: "Notes", es: "Notas" },

  // Cabeçalho do documento
  "hdr.surgeonLine": {
    pt: "Dr. António Matos da Fonseca (Médico – Cirurgia Maxilo-Facial)",
    en: "Dr António Matos da Fonseca (Doctor – Maxillofacial Surgery)",
    es: "Dr. António Matos da Fonseca (Médico – Cirugía Maxilofacial)",
  },
  "hdr.processNo": { pt: "Proc. Nº", en: "Case No.", es: "Nº de Caso" },
  "hdr.date": { pt: "Data", en: "Date", es: "Fecha" },

  // Banner de demonstração
  "demo.headerTitle": { pt: "EXEMPLO — NÃO CLÍNICO", en: "SAMPLE — NON-CLINICAL", es: "EJEMPLO — NO CLÍNICO" },
  "demo.headerBody": {
    pt: "Este protocolo é uma ficha de demonstração com dados completamente fictícios. Não deve ser utilizado para fins clínicos, legais ou administrativos.",
    en: "This protocol is a demonstration record with entirely fictitious data. It must not be used for clinical, legal or administrative purposes.",
    es: "Este protocolo es una ficha de demostración con datos completamente ficticios. No debe utilizarse con fines clínicos, legales o administrativos.",
  },
  "demo.footer": {
    pt: "DEMONSTRAÇÃO — DADOS FICTÍCIOS — NÃO CLÍNICO",
    en: "DEMONSTRATION — FICTITIOUS DATA — NON-CLINICAL",
    es: "DEMOSTRACIÓN — DATOS FICTICIOS — NO CLÍNICO",
  },
  "demo.badge": { pt: "DEMONSTRAÇÃO", en: "DEMONSTRATION", es: "DEMOSTRACIÓN" },

  // Identificação do doente
  "id.name": { pt: "Nome", en: "Name", es: "Nombre" },
  "id.ageSex": { pt: "Idade / Sexo", en: "Age / Sex", es: "Edad / Sexo" },
  "id.years": { pt: "anos", en: "years", es: "años" },
  "sex.male": { pt: "Masc", en: "Male", es: "Masc" },
  "sex.female": { pt: "Fem", en: "Female", es: "Fem" },
  "id.processNo": { pt: "Proc. Nº", en: "Case No.", es: "Nº de Caso" },
  "id.utenteNo": { pt: "Nº de Utente", en: "Health Service No.", es: "Nº de Usuario" },
  "id.citizenCardNo": { pt: "Nº Cartão de Cidadão", en: "Citizen Card No.", es: "Nº de Documento de Identidad" },
  "id.procedure": { pt: "Procedimento", en: "Procedure", es: "Procedimiento" },

  // Dados da cirurgia / internamento
  "sec.surgeryData.relatorio": { pt: "Terapêutica Cirúrgica Ortognática", en: "Orthognathic Surgical Treatment", es: "Terapéutica Quirúrgica Ortognática" },
  "surg.interventionDate": { pt: "Data da intervenção cirúrgica", en: "Date of surgical intervention", es: "Fecha de la intervención quirúrgica" },
  "surg.interventionDate.tbd": { pt: "a agendar", en: "to be scheduled", es: "por programar" },
  "surg.interventionLocation": { pt: "Local da intervenção", en: "Place of intervention", es: "Lugar de la intervención" },
  "surg.interventionLocation.tbd": { pt: "a definir", en: "to be defined", es: "por definir" },
  "surg.expectedStay": { pt: "Tempo de Internamento Previsto", en: "Expected Length of Stay", es: "Tiempo de Ingreso Previsto" },
  "surg.expectedStay.default": { pt: "24 Horas", en: "24 Hours", es: "24 Horas" },
  "surg.hospital": { pt: "Hospital", en: "Hospital", es: "Hospital" },
  "surg.surgeryDate": { pt: "Data da cirurgia", en: "Date of surgery", es: "Fecha de la cirugía" },
  "surg.surgeon": { pt: "Cirurgião", en: "Surgeon", es: "Cirujano" },
  "surg.expectedStayShort": { pt: "Internamento previsto", en: "Expected admission", es: "Ingreso previsto" },
  "surg.admission": { pt: "Internamento", en: "Admission", es: "Ingreso" },
  "surg.discharge": { pt: "Alta", en: "Discharge", es: "Alta" },
  "surg.stayDuration": { pt: "Duração do internamento", en: "Length of stay", es: "Duración del ingreso" },
  "common.hours": { pt: "horas", en: "hours", es: "horas" },
  "common.at": { pt: "às", en: "at", es: "a las" },

  // Atos médicos
  "sec.medicalActs": { pt: "Atos Médicos", en: "Medical Acts", es: "Actos Médicos" },
  "acts.intro": {
    pt: "Baseado na Tabela de Código de Nomenclatura e Valor Relativo de Actos Médicos da Ordem dos Médicos — sob anestesia geral realização de:",
    en: "Based on the Portuguese Medical Association's Nomenclature Code and Relative Value of Medical Acts table — under general anaesthesia, performance of:",
    es: "Basado en la Tabla de Código de Nomenclatura y Valor Relativo de Actos Médicos de la Orden de los Médicos — bajo anestesia general, realización de:",
  },
  "acts.empty": {
    pt: "Sem atos médicos derivados do plano cirúrgico — complete o plano primeiro.",
    en: "No medical acts derived from the surgical plan — complete the plan first.",
    es: "Sin actos médicos derivados del plan quirúrgico — complete el plan primero.",
  },

  // Equipa cirúrgica
  "sec.team": { pt: "Equipa Cirúrgica", en: "Surgical Team", es: "Equipo Quirúrgico" },
  "sec.teamShort": { pt: "Equipa", en: "Team", es: "Equipo" },
  "team.composition": {
    pt: "Equipa composta de Cirurgião, 1º Ajudante, 2º Ajudante, Instrumentista e Anestesista.",
    en: "Team comprising Surgeon, First Assistant, Second Assistant, Scrub Nurse and Anaesthetist.",
    es: "Equipo compuesto por Cirujano, 1er Ayudante, 2º Ayudante, Instrumentista y Anestesista.",
  },
  "team.lead": { pt: "Responsável pela Equipa Cirúrgica", en: "Surgical Team Lead", es: "Responsable del Equipo Quirúrgico" },
  "team.omNo": { pt: "Nº OM", en: "Medical Council No.", es: "Nº de Colegiado" },
  "team.surgeon": { pt: "Cirurgião", en: "Surgeon", es: "Cirujano" },
  "team.anesthesiologist": { pt: "Anestesista", en: "Anaesthetist", es: "Anestesista" },
  "team.firstAssistant": { pt: "1º Ajudante", en: "First Assistant", es: "1er Ayudante" },
  "team.instrumentist": { pt: "Instrumentista", en: "Scrub Nurse", es: "Instrumentista" },
  "team.secondAssistant": { pt: "2º Ajudante", en: "Second Assistant", es: "2º Ayudante" },
  "team.circulating": { pt: "Circulante", en: "Circulating Nurse", es: "Circulante" },

  // Checklist pré-operatória (antiga)
  "sec.checklist": { pt: "Checklist Pré-Operatória", en: "Pre-operative Checklist", es: "Lista de Comprobación Preoperatoria" },
  "check.status.ok": { pt: "Ok", en: "OK", es: "Ok" },
  "check.status.missing": { pt: "Em falta", en: "Missing", es: "Falta" },
  "check.status.na": { pt: "N/A", en: "N/A", es: "N/A" },

  // Avisos importantes
  "sec.alerts": { pt: "Avisos Importantes", en: "Important Warnings", es: "Avisos Importantes" },

  // Parte nasal
  "sec.nasal": { pt: "Parte Nasal", en: "Nasal Component", es: "Componente Nasal" },

  // Sequência cirúrgica
  "sec.sequence": { pt: "Sequência Cirúrgica", en: "Surgical Sequence", es: "Secuencia Quirúrgica" },

  // Registo intra-operatório
  "sec.intraop": { pt: "Registo Intra-operatório", en: "Intra-operative Record", es: "Registro Intraoperatorio" },
  "intraop.anesthesia": { pt: "Anestesia", en: "Anaesthesia", es: "Anestesia" },
  "intraop.surgery": { pt: "Cirurgia", en: "Surgery", es: "Cirugía" },
  "intraop.start": { pt: "Início", en: "Start", es: "Inicio" },
  "intraop.end": { pt: "Fim", en: "End", es: "Fin" },
  "intraop.complications": { pt: "Complicações Intra-operatórias", en: "Intra-operative Complications", es: "Complicaciones Intraoperatorias" },
  "intraop.action": { pt: "Ação", en: "Action", es: "Acción" },

  // Planeamento / fotografias / ficheiros
  "sec.planningImages": { pt: "Planeamento Virtual 3D", en: "Virtual 3D Planning", es: "Planificación Virtual 3D" },
  "sec.clinicalPhotos": { pt: "Documentação Fotográfica Clínica", en: "Clinical Photographic Documentation", es: "Documentación Fotográfica Clínica" },
  "sec.files3d": { pt: "Inventário de Ficheiros 3D", en: "3D File Inventory", es: "Inventario de Archivos 3D" },
  "files3d.file": { pt: "Ficheiro", en: "File", es: "Archivo" },
  "files3d.type": { pt: "Tipo", en: "Type", es: "Tipo" },
  "files3d.format": { pt: "Formato", en: "Format", es: "Formato" },
  "files3d.origin": { pt: "Origem", en: "Source", es: "Origen" },
  "files3d.date": { pt: "Data", en: "Date", es: "Fecha" },
  "files3d.version": { pt: "Versão", en: "Version", es: "Versión" },

  // Diagramas cirúrgicos
  "sec.diagrams": { pt: "Diagramas Cirúrgicos — Osteotomias & Marcações", en: "Surgical Diagrams — Osteotomies & Markings", es: "Diagramas Quirúrgicos — Osteotomías y Marcas" },

  // Equipamento piezoelétrico
  "sec.piezo": { pt: "Equipamento Piezoelétrico", en: "Piezoelectric Equipment", es: "Equipo Piezoeléctrico" },
  "piezo.system": { pt: "Sistema", en: "System", es: "Sistema" },
  "piezo.otherManufacturer": { pt: "Outro fabricante", en: "Other manufacturer", es: "Otro fabricante" },
  "piezo.model": { pt: "Modelo", en: "Model", es: "Modelo" },
  "piezo.tip": { pt: "Ponta / Inserto", en: "Tip / Insert", es: "Punta / Inserto" },
  "piezo.serial": { pt: "Nº de Série", en: "Serial No.", es: "Nº de Serie" },
  "piezo.notes": { pt: "Observações", en: "Notes", es: "Observaciones" },

  // Notas internas
  "sec.internalNotes": { pt: "Instruções / Notas Pós-Operatórias (Internas)", en: "Post-operative Instructions / Notes (Internal)", es: "Instrucciones / Notas Postoperatorias (Internas)" },
  "internal.reopenHistory": { pt: "Histórico de reaberturas:", en: "Reopening history:", es: "Historial de reaperturas:" },

  // Assinatura
  "sign.forRep": { pt: "p/ Dr. António Matos da Fonseca", en: "on behalf of Dr António Matos da Fonseca", es: "por Dr. António Matos da Fonseca" },
  "sign.role": { pt: "Médico – Cirurgião Maxilo-Facial", en: "Doctor – Maxillofacial Surgeon", es: "Médico – Cirujano Maxilofacial" },
  "sign.omLicense": { pt: "Cédula Profissional OM n.º 21892", en: "Medical Council Licence No. 21892", es: "Cédula Profesional OM nº 21892" },

  // Rodapé da clínica
  "footer.legal": {
    pt: "Relatório ao abrigo do Artigo 98, § 1 e 2 do Código Deontológico da Ordem dos Médicos. Relatório assinado digitalmente. Esta é uma impressão do original que está disponível para consulta, nos termos da Lei.",
    en: "Report issued under Article 98, § 1 and 2 of the Code of Ethics of the Portuguese Medical Association. Report signed digitally. This is a printout of the original, which is available for consultation under the law.",
    es: "Informe emitido al amparo del Artículo 98, § 1 y 2 del Código Deontológico de la Orden de los Médicos. Informe firmado digitalmente. Esta es una impresión del original que está disponible para consulta, en los términos de la Ley.",
  },

  // Complementos estruturados (regiões e etiquetas fixas)
  "compl.byRegion": { pt: "Complementos por Região", en: "Complements by Region", es: "Complementos por Región" },
  "compl.alloplastic": { pt: "Implantes aloplásticos", en: "Alloplastic implants", es: "Implantes aloplásticos" },
  "compl.region": { pt: "Região", en: "Region", es: "Región" },
  "compl.side": { pt: "Lado", en: "Side", es: "Lado" },
  "compl.material": { pt: "Material", en: "Material", es: "Material" },
  "compl.brandRef": { pt: "Marca / Ref.", en: "Brand / Ref.", es: "Marca / Ref." },
  "compl.lot": { pt: "Lote", en: "Batch", es: "Lote" },
  "compl.other": { pt: "Outros procedimentos", en: "Other procedures", es: "Otros procedimientos" },

  // Lab prediction (etiquetas fixas)
  "lab.mallampati": { pt: "Mallampati", en: "Mallampati", es: "Mallampati" },
  "lab.surgeryStart": { pt: "Início da cirurgia", en: "Surgery start", es: "Inicio de la cirugía" },
  "lab.specialCare": { pt: "Cuidados especiais", en: "Special care", es: "Cuidados especiales" },
  "lab.complements": { pt: "Complementos", en: "Complements", es: "Complementos" },
  "lab.col.no": { pt: "Nº", en: "No.", es: "Nº" },
  "lab.col.check": { pt: "Verificação", en: "Check", es: "Verificación" },
  "lab.col.result": { pt: "Resultado", en: "Result", es: "Resultado" },
  "lab.col.sideShort": { pt: "Lado", en: "Side", es: "Lado" },
  "lab.col.note": { pt: "Nota", en: "Note", es: "Nota" },

  // Plano cirúrgico (movimentos)
  "plan.title": { pt: "Plano Cirúrgico — Movimentos Planeados", en: "Surgical Plan — Planned Movements", es: "Plan Quirúrgico — Movimientos Planificados" },
  "plan.col.segment": { pt: "Segmento", en: "Segment", es: "Segmento" },
  "plan.col.sagittal": { pt: "Avanço/Recuo\n(Sagital)", en: "Advance/Setback\n(Sagittal)", es: "Avance/Retroceso\n(Sagital)" },
  "plan.col.vertical": { pt: "Impacção/Descida\n(Vertical)", en: "Impaction/Down-graft\n(Vertical)", es: "Impactación/Descenso\n(Vertical)" },
  "plan.col.transverseR": { pt: "Transverso Dir.", en: "Transverse R.", es: "Transverso Der." },
  "plan.col.transverseL": { pt: "Transverso Esq.", en: "Transverse L.", es: "Transverso Izq." },
  "plan.col.rotation": { pt: "Rotação (Yaw)", en: "Rotation (Yaw)", es: "Rotación (Yaw)" },
  "plan.maxilla": { pt: "Maxila", en: "Maxilla", es: "Maxila" },
  "plan.mandible": { pt: "Mandíbula", en: "Mandible", es: "Mandíbula" },
  "plan.chin": { pt: "Mento", en: "Chin", es: "Mentón" },
  "plan.maxillaRight": { pt: "Maxila — Dta. (ENP)", en: "Maxilla — R. (PNS)", es: "Maxila — Der. (ENP)" },
  "plan.maxillaLeft": { pt: "Maxila — Esq. (ponto A)", en: "Maxilla — L. (point A)", es: "Maxila — Izq. (punto A)" },
  "plan.boneGraft": { pt: "Enxerto ósseo", en: "Bone graft", es: "Injerto óseo" },
  "plan.condylar": { pt: "Condilar", en: "Condylar", es: "Condilar" },
  "plan.mentoplasty": { pt: "Mentoplastia", en: "Genioplasty", es: "Mentoplastia" },
  "plan.associated": { pt: "Procedimentos associados", en: "Associated procedures", es: "Procedimientos asociados" },

  // Osteossíntese
  "ost.title": { pt: "Materiais de Osteossíntese", en: "Osteosynthesis Materials", es: "Materiales de Osteosíntesis" },
  "ost.platesUsed": { pt: "Placas Utilizadas", en: "Plates Used", es: "Placas Utilizadas" },
  "ost.plate": { pt: "placa", en: "plate", es: "placa" },
  "ost.plates": { pt: "placas", en: "plates", es: "placas" },
  "ost.col.type": { pt: "Tipo", en: "Type", es: "Tipo" },
  "ost.col.zone": { pt: "Zona", en: "Zone", es: "Zona" },
  "ost.col.brandSystem": { pt: "Marca / Sistema", en: "Brand / System", es: "Marca / Sistema" },
  "ost.col.reference": { pt: "Referência", en: "Reference", es: "Referencia" },
  "ost.col.lot": { pt: "Lote", en: "Batch", es: "Lote" },
  "ost.col.qty": { pt: "Qtd", en: "Qty", es: "Cant." },
  "ost.screwDetail": { pt: "Detalhe de Parafusos por Placa", en: "Screw Detail per Plate", es: "Detalle de Tornillos por Placa" },
  "ost.col.plate": { pt: "Placa", en: "Plate", es: "Placa" },
  "ost.col.selfTap": { pt: "Auto-Perf.", en: "Self-tap.", es: "Autorroscante" },
  "ost.col.diameter": { pt: "Diâm.", en: "Diam.", es: "Diám." },
  "ost.col.lengthShort": { pt: "Comp.", en: "Length", es: "Long." },
  "ost.col.qtyShort": { pt: "Qtd.", en: "Qty.", es: "Cant." },
  "ost.col.location": { pt: "Localização", en: "Location", es: "Localización" },
  "ost.drillsUsed": { pt: "Brocas Utilizadas", en: "Drills Used", es: "Fresas Utilizadas" },
  "ost.col.brand": { pt: "Marca", en: "Brand", es: "Marca" },
  "ost.col.diameterMm": { pt: "Diâm. (mm)", en: "Diam. (mm)", es: "Diám. (mm)" },
  "ost.col.uses": { pt: "Nº Utilizações", en: "No. of Uses", es: "Nº de Usos" },
  "ost.drill.twist": { pt: "Helicoidal", en: "Twist", es: "Helicoidal" },
  "ost.drill.step": { pt: "Escalonada", en: "Step", es: "Escalonada" },
  "ost.sawsUsed": { pt: "Serras / Lâminas Utilizadas", en: "Saws / Blades Used", es: "Sierras / Hojas Utilizadas" },
  "ost.col.bladeRef": { pt: "Ref. Lâmina", en: "Blade Ref.", es: "Ref. Hoja" },
  "ost.saw.oscillating": { pt: "Oscilante", en: "Oscillating", es: "Oscilante" },
  "ost.saw.sagittal": { pt: "Sagital", en: "Sagittal", es: "Sagital" },
  "ost.saw.reciprocating": { pt: "Recíproca", en: "Reciprocating", es: "Recíproca" },
};

function t(key: string, lang: DocLang): string {
  return I18N[key]?.[lang] ?? I18N[key]?.pt ?? key;
}

// ─── Relato operatório: mover parágrafos de cirurgia virtual / guias para o fim ──
// Não altera os dados gravados; apenas reordena na renderização.
const VIRTUAL_SURGERY_RE = /cirurgia\s+virtual|guias?\s+cir[uú]rgicas?/i;

function reorderOperativeDescription(text?: string | null): string {
  if (!text) return "";
  const paragraphs = text.split(/\n{2,}/);
  if (paragraphs.length <= 1) return text;
  const moved: string[] = [];
  const kept: string[] = [];
  let stillLeading = true;
  for (const p of paragraphs) {
    // Só movemos os parágrafos que aparecem NO INÍCIO do texto.
    if (stillLeading && VIRTUAL_SURGERY_RE.test(p)) {
      moved.push(p);
    } else {
      stillLeading = false;
      kept.push(p);
    }
  }
  if (moved.length === 0) return text;
  return [...kept, ...moved].join("\n\n");
}

// ─── Plano Cirúrgico print sub-section ──────────────────────────────────────

const MAXILLA_OSTEOTOMY_LABELS: Record<string, string> = {
  LeFort_I: "LeFort I Standard",
  LeFort_II: "LeFort II",
  LeFort_III: "LeFort III",
  segmented: "LeFort I Segmentada",
  expansion: "Expansão",
  SARPE: "SARPE",
};

const MANDIBLE_OSTEOTOMY_LABELS: Record<string, string> = {
  BSSO: "BSSO (Sagital Bilateral)",
  vertical_ramus: "Ramo Vertical",
  intraoral_vertical_ramus: "Ramo Vertical Intraoral",
  genioplasty_only: "Apenas Mentoplastia",
  distraction: "Distração Osteogénica",
};

const CHIN_PROCEDURE_LABELS: Record<string, string> = {
  advancement: "Avanço",
  setback: "Recuo",
  vertical_reduction: "Redução Vertical",
  vertical_augmentation: "Aumento Vertical",
  asymmetry_correction: "Correção de Assimetria",
};

const CONDYLAR_LABELS: Record<string, string> = {
  manual: "Manual / Passivo",
  navigation: "Navegação",
  splint: "Goteira de Posicionamento",
};

function fmtMm(value: number | null | undefined): string {
  return value === null || value === undefined || Number.isNaN(value) ? "—" : `${value} mm`;
}

function fmtDeg(value: number | null | undefined): string {
  return value === null || value === undefined || Number.isNaN(value) ? "—" : `${value}°`;
}

const SEGMENT_PRINT_LABELS: Record<string, string> = {
  total: "Total",
  anterior: "Seg. Anterior",
  posterior_left: "Seg. Posterior Esq.",
  posterior_right: "Seg. Posterior Dir.",
  left: "Seg. Esquerdo",
  right: "Seg. Direito",
};

function MovementsRow({ segment, movements }: { segment: string; movements?: OrthoMovements | null }) {
  return (
    <tr>
      <td className="border border-gray-300 px-2 py-1 font-semibold">{segment}</td>
      <td className="border border-gray-300 px-2 py-1 text-center font-mono">{fmtMm(movements?.sagittal)}</td>
      <td className="border border-gray-300 px-2 py-1 text-center font-mono">{fmtMm(movements?.vertical)}</td>
      <td className="border border-gray-300 px-2 py-1 text-center font-mono">{fmtMm(movements?.transverseRight)}</td>
      <td className="border border-gray-300 px-2 py-1 text-center font-mono">{fmtMm(movements?.transverseLeft)}</td>
      <td className="border border-gray-300 px-2 py-1 text-center font-mono">{fmtDeg(movements?.rotation)}</td>
    </tr>
  );
}

function tMultiline(key: string, lang: DocLang): React.ReactNode {
  const parts = t(key, lang).split("\n");
  return parts.map((p, i) => (
    <span key={i}>{i > 0 && <br />}{p}</span>
  ));
}

function SurgicalPlanPrint({ plan, lang = "pt" }: { plan: SurgicalPlan; lang?: DocLang }) {
  const maxilla = plan.maxilla?.included ? plan.maxilla : undefined;
  const mandible = plan.mandible?.included ? plan.mandible : undefined;
  const chin = plan.chin?.included ? plan.chin : undefined;
  const associated = plan.associated || [];
  if (!maxilla && !mandible && !chin && associated.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-sm font-bold uppercase tracking-widest bg-gray-100 p-2 mb-4 border-l-4 border-primary">
        {t("plan.title", lang)}
      </h2>

      <table className="w-full text-xs border-collapse border border-gray-300 mb-3">
        <thead className="bg-gray-50">
          <tr>
            <th className="border border-gray-300 px-2 py-1 text-left">{t("plan.col.segment", lang)}</th>
            <th className="border border-gray-300 px-2 py-1 text-center">{tMultiline("plan.col.sagittal", lang)}</th>
            <th className="border border-gray-300 px-2 py-1 text-center">{tMultiline("plan.col.vertical", lang)}</th>
            <th className="border border-gray-300 px-2 py-1 text-center">{t("plan.col.transverseR", lang)}</th>
            <th className="border border-gray-300 px-2 py-1 text-center">{t("plan.col.transverseL", lang)}</th>
            <th className="border border-gray-300 px-2 py-1 text-center">{t("plan.col.rotation", lang)}</th>
          </tr>
        </thead>
        <tbody>
          {maxilla &&
            (maxilla.segments && maxilla.segments.length > 1 ? (
              maxilla.segments.map((seg, i) => (
                <MovementsRow
                  key={i}
                  segment={`${t("plan.maxilla", lang)} — ${SEGMENT_PRINT_LABELS[seg.segment as string] || seg.segment || "Total"}`}
                  movements={seg.movements}
                />
              ))
            ) : (() => {
              const m = maxilla.segments?.[0]?.movements;
              const hasSides = m && (m.sagittalRight != null || m.sagittalLeft != null || m.verticalRight != null || m.verticalLeft != null);
              return hasSides ? (
                <>
                  <MovementsRow segment={t("plan.maxillaRight", lang)} movements={{ sagittal: m!.sagittalRight, vertical: m!.verticalRight, transverseRight: m!.transverseRight, rotation: m!.rotation }} />
                  <MovementsRow segment={t("plan.maxillaLeft", lang)} movements={{ sagittal: m!.sagittalLeft, vertical: m!.verticalLeft, transverseLeft: m!.transverseLeft }} />
                </>
              ) : (
                <MovementsRow segment={t("plan.maxilla", lang)} movements={m} />
              );
            })())}
          {mandible && <MovementsRow segment={t("plan.mandible", lang)} movements={mandible.movements} />}
          {chin && <MovementsRow segment={t("plan.chin", lang)} movements={chin.movements} />}
        </tbody>
      </table>

      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
        {maxilla && (
          <div>
            <span className="font-semibold text-gray-600">{t("plan.maxilla", lang)}:</span>{" "}
            {maxilla.osteotomyType ? (MAXILLA_OSTEOTOMY_LABELS[maxilla.osteotomyType] || maxilla.osteotomyType) : "LeFort I Standard"}
            {maxilla.bonGraft ? ` • ${t("plan.boneGraft", lang)}${maxilla.graftSource ? ` (${maxilla.graftSource})` : ""}` : ""}
            {maxilla.notes ? ` • ${maxilla.notes}` : ""}
          </div>
        )}
        {mandible && (
          <div>
            <span className="font-semibold text-gray-600">{t("plan.mandible", lang)}:</span>{" "}
            {mandible.osteotomyType ? (MANDIBLE_OSTEOTOMY_LABELS[mandible.osteotomyType] || mandible.osteotomyType) : "BSSO (Sagital Bilateral)"}
            {mandible.condylarPositioning ? ` • ${t("plan.condylar", lang)}: ${CONDYLAR_LABELS[mandible.condylarPositioning] || mandible.condylarPositioning}` : ""}
            {mandible.notes ? ` • ${mandible.notes}` : ""}
          </div>
        )}
        {chin && (
          <div>
            <span className="font-semibold text-gray-600">{t("plan.chin", lang)}:</span>{" "}
            {chin.procedure ? (CHIN_PROCEDURE_LABELS[chin.procedure] || chin.procedure) : t("plan.mentoplasty", lang)}
            {chin.notes ? ` • ${chin.notes}` : ""}
          </div>
        )}
        {associated.length > 0 && (
          <div className="col-span-2">
            <span className="font-semibold text-gray-600">{t("plan.associated", lang)}:</span>{" "}
            {associated.map((p) => `${p.name}${p.details ? ` (${p.details})` : ""}`).join("; ")}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Osteossíntese print sub-section ────────────────────────────────────────

function OsteosynthesisPrint({ plates, drills, saws, lang = "pt" }: {
  plates: PlateRecord[];
  drills?: DrillRecord[];
  saws?: SawRecord[];
  lang?: DocLang;
}) {
  if (!plates.length && !drills?.length && !saws?.length) return null;

  return (
    <div className="mb-8">
      <h2 className="text-sm font-bold uppercase tracking-widest bg-gray-100 p-2 mb-4 border-l-4 border-primary">
        {t("ost.title", lang)}
      </h2>

      <div className="flex gap-6 items-start mb-5">
        {/* Anatomical map */}
        <div className="flex-shrink-0">
          <AnatomicalMapPrint plates={plates} />
        </div>

        {/* Plates summary */}
        <div className="flex-1">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
            {t("ost.platesUsed", lang)} — {plates.length} {plates.length !== 1 ? t("ost.plates", lang) : t("ost.plate", lang)}
          </div>
          <table className="w-full text-xs border-collapse border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="border border-gray-300 px-2 py-1 text-left">#</th>
                <th className="border border-gray-300 px-2 py-1 text-left">{t("ost.col.type", lang)}</th>
                <th className="border border-gray-300 px-2 py-1 text-left">{t("ost.col.zone", lang)}</th>
                <th className="border border-gray-300 px-2 py-1 text-left">{t("ost.col.brandSystem", lang)}</th>
                <th className="border border-gray-300 px-2 py-1 text-left">{t("ost.col.reference", lang)}</th>
                <th className="border border-gray-300 px-2 py-1 text-left">{t("ost.col.lot", lang)}</th>
                <th className="border border-gray-300 px-2 py-1 text-center">{t("ost.col.qty", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {plates.map((plate, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="border border-gray-300 px-2 py-1 text-center font-mono text-gray-500">{idx + 1}</td>
                  <td className="border border-gray-300 px-2 py-1 font-semibold">
                    {plate.plateType ? (PLATE_TYPE_LABELS[plate.plateType] || plate.type || plate.plateType) : (plate.type || "—")}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-gray-700">
                    {plate.anatomicalZone ? (ZONE_LABELS[plate.anatomicalZone] || plate.location || "—") : (plate.location || "—")}
                  </td>
                  <td className="border border-gray-300 px-2 py-1">{plate.brand || "—"} {plate.system || ""}</td>
                  <td className="border border-gray-300 px-2 py-1 font-mono text-gray-700">{plate.reference || "—"}</td>
                  <td className="border border-gray-300 px-2 py-1 font-mono text-gray-700">{plate.lot || "—"}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{plate.quantity || 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-plate screws detail */}
      {plates.some(p => p.screws && p.screws.length > 0) && (
        <div className="mb-4">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">{t("ost.screwDetail", lang)}</div>
          <table className="w-full text-[11px] border-collapse border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="border border-gray-300 px-2 py-1 text-left">{t("ost.col.plate", lang)}</th>
                <th className="border border-gray-300 px-2 py-1 text-left">{t("ost.col.type", lang)}</th>
                <th className="border border-gray-300 px-2 py-1 text-center">{t("ost.col.selfTap", lang)}</th>
                <th className="border border-gray-300 px-2 py-1 text-center">{t("ost.col.diameter", lang)}</th>
                <th className="border border-gray-300 px-2 py-1 text-center">{t("ost.col.lengthShort", lang)}</th>
                <th className="border border-gray-300 px-2 py-1 text-center">{t("ost.col.qtyShort", lang)}</th>
                <th className="border border-gray-300 px-2 py-1 text-left">{t("ost.col.reference", lang)}</th>
                <th className="border border-gray-300 px-2 py-1 text-left">{t("ost.col.lot", lang)}</th>
                <th className="border border-gray-300 px-2 py-1 text-left">{t("ost.col.location", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {plates.flatMap((plate, pi) =>
                (plate.screws || []).map((screw, si) => {
                  const plateLabel = plate.plateType
                    ? (PLATE_TYPE_LABELS[plate.plateType] || plate.type || `#${pi + 1}`)
                    : `#${pi + 1}`;
                  const zoneLabel = plate.anatomicalZone
                    ? (ZONE_LABELS[plate.anatomicalZone] || plate.location || "")
                    : (plate.location || "");
                  return (
                    <tr key={`${pi}-${si}`} className={pi % 2 === 0 ? "bg-white" : "bg-gray-50/30"}>
                      {si === 0 && (
                        <td
                          className="border border-gray-300 px-2 py-1 font-semibold align-top"
                          rowSpan={plate.screws!.length}
                        >
                          <div>{plateLabel}</div>
                          {zoneLabel && <div className="text-gray-500 font-normal text-[10px]">{zoneLabel}</div>}
                        </td>
                      )}
                      <td className="border border-gray-300 px-2 py-1">{screw.screwType ? (SCREW_TYPE_LABELS[screw.screwType] ?? screw.screwType) : "—"}</td>
                      <td className="border border-gray-300 px-2 py-1 text-center">{screw.selfTapping ? "✓" : "—"}</td>
                      <td className="border border-gray-300 px-2 py-1 text-center font-mono">{screw.diameter ? `Ø${screw.diameter}` : "—"}</td>
                      <td className="border border-gray-300 px-2 py-1 text-center font-mono">
                        {screw.length === 0 ? (screw.lengthCustom ? `${screw.lengthCustom}mm` : "—") : (screw.length ? `${screw.length}mm` : "—")}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-center font-semibold">{screw.quantity ?? "—"}</td>
                      <td className="border border-gray-300 px-2 py-1 font-mono text-gray-700">{screw.reference || "—"}</td>
                      <td className="border border-gray-300 px-2 py-1 font-mono text-gray-700">{screw.lot || "—"}</td>
                      <td className="border border-gray-300 px-2 py-1 text-gray-600">{screw.location || "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Drills */}
      {(drills || []).length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">{t("ost.drillsUsed", lang)}</div>
          <table className="w-full text-xs border-collapse border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="border border-gray-300 px-2 py-1 text-left">{t("ost.col.brand", lang)}</th>
                <th className="border border-gray-300 px-2 py-1 text-left">{t("ost.col.diameterMm", lang)}</th>
                <th className="border border-gray-300 px-2 py-1 text-left">{t("ost.col.type", lang)}</th>
                <th className="border border-gray-300 px-2 py-1 text-left">{t("ost.col.reference", lang)}</th>
                <th className="border border-gray-300 px-2 py-1 text-center">{t("ost.col.uses", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {(drills || []).map((d, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="border border-gray-300 px-2 py-1">{d.brand || "—"}</td>
                  <td className="border border-gray-300 px-2 py-1 font-mono">{d.diameter || "—"}</td>
                  <td className="border border-gray-300 px-2 py-1">{d.drillType === "twist" ? t("ost.drill.twist", lang) : d.drillType === "step" ? t("ost.drill.step", lang) : "—"}</td>
                  <td className="border border-gray-300 px-2 py-1 font-mono text-gray-700">{d.reference || "—"}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{d.usedCount ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Saws */}
      {(saws || []).length > 0 && (
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">{t("ost.sawsUsed", lang)}</div>
          <table className="w-full text-xs border-collapse border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="border border-gray-300 px-2 py-1 text-left">{t("ost.col.brand", lang)}</th>
                <th className="border border-gray-300 px-2 py-1 text-left">{t("ost.col.type", lang)}</th>
                <th className="border border-gray-300 px-2 py-1 text-left">{t("ost.col.bladeRef", lang)}</th>
                <th className="border border-gray-300 px-2 py-1 text-center">{t("ost.col.uses", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {(saws || []).map((s, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="border border-gray-300 px-2 py-1">{s.brand || "—"}</td>
                  <td className="border border-gray-300 px-2 py-1">
                    {s.sawType === "oscillating" ? t("ost.saw.oscillating", lang) : s.sawType === "sagittal" ? t("ost.saw.sagittal", lang) : s.sawType === "reciprocating" ? t("ost.saw.reciprocating", lang) : "—"}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 font-mono text-gray-700">{s.bladeRef || "—"}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{s.usedCount ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Seleção de secções & presets ────────────────────────────────────────────

type SectionKey =
  | "identification" | "surgeryData" | "team" | "diagnosis" | "labPrediction"
  | "checklist" | "plan" | "planningImages" | "clinicalPhotos" | "sequence"
  | "intraop" | "materials" | "operativeReport" | "recommendations"
  | "homeMedication" | "nextAppointment" | "internalNotes" | "diagrams"
  | "files3d" | "piezo" | "summary" | "medicalActs"
  | "prepChecklist" | "patientInstructions";

const SECTION_DEFS: Array<{ key: SectionKey; label: string }> = [
  { key: "identification", label: "Identificação do doente" },
  { key: "surgeryData", label: "Dados da cirurgia / internamento" },
  { key: "team", label: "Equipa cirúrgica" },
  { key: "diagnosis", label: "Diagnóstico" },
  { key: "labPrediction", label: "Protocolo/Execução Cirúrgica" },
  { key: "checklist", label: "Checklist pré-operatória (antiga)" },
  { key: "prepChecklist", label: "Checklist de Preparação" },
  { key: "patientInstructions", label: "Instruções ao doente (QR/link)" },
  { key: "plan", label: "Plano cirúrgico (movimentos)" },
  { key: "planningImages", label: "Imagens de planeamento" },
  { key: "clinicalPhotos", label: "Fotografia clínica" },
  { key: "sequence", label: "Sequência cirúrgica" },
  { key: "intraop", label: "Registo intra-operatório" },
  { key: "materials", label: "Materiais de osteossíntese" },
  { key: "diagrams", label: "Diagramas cirúrgicos" },
  { key: "files3d", label: "Inventário de ficheiros 3D" },
  { key: "piezo", label: "Equipamento piezoelétrico" },
  { key: "medicalActs", label: "Atos médicos (códigos OM / valores K)" },
  { key: "operativeReport", label: "Relato operatório" },
  { key: "recommendations", label: "Recomendações pós-operatórias" },
  { key: "homeMedication", label: "Medicação para domicílio" },
  { key: "nextAppointment", label: "Próxima consulta" },
  { key: "summary", label: "Resumo (Notas de Alta)" },
  { key: "internalNotes", label: "Observações internas" },
];

type DocStyle = "protocolo" | "nota_cdf" | "nota_bloco" | "relatorio";

const ALL_KEYS = SECTION_DEFS.map((s) => s.key);

const PRESETS: Array<{ id: string; label: string; style: DocStyle; sections: SectionKey[] }> = [
  {
    id: "nota_cdf",
    label: "Nota de Alta — Clínica da Face",
    style: "nota_cdf",
    sections: ["identification", "surgeryData", "diagnosis", "operativeReport", "recommendations", "summary"],
  },
  {
    id: "nota_bloco",
    label: "Nota de Alta — Doente (O Bloco)",
    style: "nota_bloco",
    sections: ["identification", "surgeryData", "operativeReport", "recommendations", "homeMedication", "nextAppointment"],
  },
  {
    id: "completo",
    label: "Protocolo Interno Completo",
    style: "protocolo",
    sections: ALL_KEYS.filter((k) => k !== "summary"),
  },
  {
    id: "dia_cirurgia",
    label: "Checklist Dia da Cirurgia",
    style: "protocolo",
    sections: ["identification", "labPrediction", "checklist"],
  },
  {
    id: "relato",
    label: "Apenas Relato Operatório",
    style: "protocolo",
    sections: ["identification", "operativeReport"],
  },
  {
    id: "relatorio_seguradora",
    label: "Relatório Clínico Pré-operatório (Seguradora)",
    style: "relatorio",
    sections: ["identification", "diagnosis", "surgeryData", "medicalActs", "team"],
  },
];

// ─── Atos médicos (Nomenclatura da Ordem dos Médicos) ────────────────────────
// Derivados automaticamente do plano cirúrgico gravado.
interface MedicalAct { code: string; name: string; k: string }

function deriveMedicalActs(plan?: SurgicalPlan | null): MedicalAct[] {
  if (!plan) return [];
  const acts: MedicalAct[] = [];
  const assoc = plan.associated ?? [];
  const textOf = (a: { name?: string; details?: string }) => `${a.name ?? ""} ${a.details ?? ""}`.toLowerCase();
  const assocMatch = (...terms: string[]) => assoc.some((a) => terms.some((t) => textOf(a).includes(t)));
  const nasal = (plan.nasalNotes ?? "").toLowerCase();

  if (plan.mandible?.included && plan.mandible.osteotomyType !== "genioplasty_only") {
    acts.push({ code: "33.00.00.23", name: "Osteoplastia mandibular", k: "K 300" });
  }
  if (assocMatch("segmentar mand", "mandíbula segmentar", "mandibula segmentar")) {
    acts.push({ code: "33.00.00.24", name: "Osteoplastia da mandíbula segmentar", k: "K 200" });
  }
  const mx = plan.maxilla;
  if (mx?.included) {
    // Tipo por omissão: o formulário trata maxila incluída sem tipo como LeFort I
    const t = mx.osteotomyType || "LeFort_I";
    const segmented = t === "segmented" || (mx.segments ?? []).some((s) => s.segment && s.segment !== "total");
    if (t.startsWith("LeFort") || segmented) {
      acts.push({ code: "33.00.00.26", name: "Osteoplastia do maxilar superior, tipo LeFort I", k: "K 200" });
    }
    if (segmented) {
      acts.push({ code: "33.00.00.31", name: "Osteotomia segmentar do maxilar superior", k: "K 150" });
    }
    if (t === "expansion" || t === "SARPE") {
      acts.push({ code: "33.00.00.33", name: "Disjunção intermaxilar", k: "K 150" });
    }
  }
  if (assocMatch("septo") || nasal.includes("septo")) {
    acts.push({ code: "34.00.00.23", name: "Septoplastia", k: "K 120" });
  }
  if (assocMatch("corneto", "turbin") || nasal.includes("corneto")) {
    acts.push({ code: "34.00.00.06", name: "Eletrocoagulação dos cornetos bilateral", k: "K 036" });
  }
  if (plan.chin?.included || plan.mandible?.osteotomyType === "genioplasty_only") {
    acts.push({ code: "30.02.00.32", name: "Mentoplastia com osteotomias de avanço", k: "K 120" });
  }
  return acts;
}

function emptySelection(): Record<SectionKey, boolean> {
  return Object.fromEntries(ALL_KEYS.map((k) => [k, false])) as Record<SectionKey, boolean>;
}

// ─── Helpers de conteúdo ─────────────────────────────────────────────────────

function stayDuration(admission: string | null | undefined, discharge: string | null | undefined, lang: DocLang): string | null {
  if (!admission || !discharge) return null;
  const a = new Date(admission);
  const d = new Date(discharge);
  if (isNaN(a.getTime()) || isNaN(d.getTime()) || d <= a) return null;
  return `${Math.round((d.getTime() - a.getTime()) / 3600000)} ${t("common.hours", lang)}`;
}

function fmtDateTime(value: string | null | undefined, lang: DocLang): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const at = t("common.at", lang);
  return `${format(d, "dd/MM/yyyy")} ${at} ${format(d, "HH:mm")}`;
}

const SKELETAL_LABELS: Record<string, string> = { I: "Classe I", II: "Classe II", III: "Classe III" };
const VERTICAL_LABELS: Record<string, string> = {
  normodivergent: "normodivergente",
  hyperdivergent: "hiperdivergente",
  hypodivergent: "hipodivergente",
};

function diagnosisNarrative(diag?: PreopDiagnosis | null): string {
  if (!diag) return "";
  const parts: string[] = [];
  if (diag.skeletalClass) parts.push(`Deformidade dento-maxilo-facial — ${SKELETAL_LABELS[diag.skeletalClass] || diag.skeletalClass} esquelética`);
  if (diag.verticalPattern) parts.push(`padrão ${VERTICAL_LABELS[diag.verticalPattern] || diag.verticalPattern}`);
  if (diag.facialAsymmetry) parts.push(`assimetria facial${diag.asymmetryDetails ? ` (${diag.asymmetryDetails})` : ""}`);
  if (diag.openBite) parts.push("mordida aberta");
  if (diag.crossBite) parts.push("mordida cruzada");
  if (diag.airwayCompromise) parts.push("compromisso da via aérea");
  if (diag.tmjSymptoms) parts.push("sintomatologia da ATM");
  let text = parts.join(", ");
  if (text) text += ".";
  if (diag.additionalNotes) text += (text ? "\n" : "") + diag.additionalNotes;
  return text;
}

const MALLAMPATI_LABELS: Record<string, string> = { I: "I", II: "II", III: "III", IV: "IV" };
const SURGERY_START_LABELS: Record<string, string> = { mandibula: "Mandíbula", maxila: "Maxila" };
const COMPLEMENT_LABELS: Array<{ key: "septoplasty" | "segmented" | "mentoplasty" | "atmProsthesis"; label: string }> = [
  { key: "septoplasty", label: "Septoplastia" },
  { key: "segmented", label: "Segmentar" },
  { key: "mentoplasty", label: "Mentoplastia" },
  { key: "atmProsthesis", label: "Prótese ATM" },
];

function LabPredictionPrint({ lab, lang = "pt" }: { lab: LabPrediction; lang?: DocLang }) {
  const checks = lab.checks ?? [];
  const complements = lab.complements ?? {};
  const activeComplements = COMPLEMENT_LABELS.filter((c) => complements[c.key]);
  return (
    <div className="mb-8">
      <h2 className="text-sm font-bold uppercase tracking-widest bg-gray-100 p-2 mb-4 border-l-4 border-primary">
        {t("sec.labPrediction", lang)}
      </h2>
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-4">
        <div><span className="font-semibold text-gray-600">{t("lab.mallampati", lang)}:</span> {lab.mallampati ? MALLAMPATI_LABELS[lab.mallampati] || lab.mallampati : "—"}</div>
        <div><span className="font-semibold text-gray-600">{t("lab.surgeryStart", lang)}:</span> {lab.surgeryStart ? SURGERY_START_LABELS[lab.surgeryStart] || lab.surgeryStart : "—"}</div>
        {lab.specialCare && (
          <div className="col-span-2"><span className="font-semibold text-gray-600">{t("lab.specialCare", lang)}:</span> {lab.specialCare}</div>
        )}
        <div className="col-span-2">
          <span className="font-semibold text-gray-600">{t("lab.complements", lang)}:</span>{" "}
          {activeComplements.length > 0 || complements.other
            ? [...activeComplements.map((c) => c.label), ...(complements.other ? [complements.other] : [])].join(" • ")
            : "—"}
        </div>
      </div>
      {checks.length > 0 && (
        <table className="w-full text-xs border-collapse border border-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="border border-gray-300 px-2 py-1 text-left w-8">{t("lab.col.no", lang)}</th>
              <th className="border border-gray-300 px-2 py-1 text-left">{t("lab.col.check", lang)}</th>
              <th className="border border-gray-300 px-2 py-1 text-left">{t("lab.col.result", lang)}</th>
              <th className="border border-gray-300 px-2 py-1 text-center">{t("lab.col.sideShort", lang)}</th>
              <th className="border border-gray-300 px-2 py-1 text-center">mm</th>
              <th className="border border-gray-300 px-2 py-1 text-left">{t("lab.col.note", lang)}</th>
            </tr>
          </thead>
          <tbody>
            {LAB_CHECKS.map((def, i) => {
              const check = checks.find((c) => c.id === def.id);
              return (
                <tr key={def.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="border border-gray-300 px-2 py-1 text-center font-mono">{def.id}</td>
                  <td className="border border-gray-300 px-2 py-1">{def.label.replace(/^\d+\s—\s/, "")}</td>
                  <td className="border border-gray-300 px-2 py-1 font-semibold">{check?.option ? checkOptionLabel(def.id, check.option) : "—"}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{check?.side || "—"}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center font-mono">{check?.valueMm ?? "—"}</td>
                  <td className="border border-gray-300 px-2 py-1 text-gray-600">{check?.note || def.fixedNote || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <StructuredComplements lab={lab} lang={lang} />
    </div>
  );
}

// ─── Rodapé & assinatura ─────────────────────────────────────────────────────

function ClinicFooter({ legal, lang = "pt" }: { legal?: boolean; lang?: DocLang }) {
  return (
    <div className="mt-10 pt-4 border-t border-gray-400 text-center text-[10px] text-gray-600 leading-relaxed">
      {legal && (
        <p className="mb-2 italic text-gray-500">
          {t("footer.legal", lang)}
        </p>
      )}
      <p className="font-semibold text-gray-700">Clínica da Face</p>
      <p>Avenida José Gomes Ferreira, 15, Piso 4, Edifício Atlas IV, 1495-139 Algés – Lisboa</p>
      <p>Tel. +351 217 210 900 · +351 937 210 900 · WhatsApp +351 937 210 900 · www.clinicadaface.com · clinica@clinicadaface.com</p>
    </div>
  );
}

function SurgeonSignature({ representative, signatureUrl, lang = "pt" }: { representative?: string | null; signatureUrl?: string | null; lang?: DocLang }) {
  const rep = representative?.trim();
  return (
    <div className="mt-16 flex justify-end pr-8">
      <div className="text-center w-72">
        {signatureUrl ? (
          <img src={signatureUrl} alt="Assinatura" className="mx-auto h-16 object-contain mb-1" />
        ) : (
          <div className="border-b border-black mb-2 h-14"></div>
        )}
        {rep && <div className="text-xs text-gray-600">{t("sign.forRep", lang)}</div>}
        <div className="text-sm font-bold">{rep || "Dr. António Matos da Fonseca"}</div>
        <div className="text-[10px] text-gray-600">{t("sign.role", lang)}</div>
        <div className="text-[10px] text-gray-500">{t("sign.omLicense", lang)}</div>
      </div>
    </div>
  );
}

function PrintSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-bold uppercase tracking-widest bg-gray-100 p-2 mb-4 border-l-4 border-primary">{title}</h2>
      {children}
    </div>
  );
}

// ─── Bloco de texto editável na pré-visualização ────────────────────────────
// Mostra o texto derivado ou a edição gravada (documentEdits). Permite editar
// diretamente (textarea inline) e repor o texto original. Os controlos são
// ocultados na impressão (print:hidden).
interface EditableTextProps {
  value: string;
  hasEdit: boolean;
  className?: string;
  placeholder?: string;
  onSave: (text: string) => void;
  onReset: () => void;
  disabled?: boolean;
  saving?: boolean;
}

function EditableText({ value, hasEdit, className, placeholder, onSave, onReset, disabled, saving }: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const startEdit = () => { setDraft(value); setEditing(true); };
  const commit = () => { onSave(draft); setEditing(false); };

  if (editing) {
    return (
      <div className="print:hidden">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={Math.min(20, Math.max(4, draft.split("\n").length + 1))}
          className="text-sm font-serif rounded-sm"
        />
        <div className="flex gap-2 mt-2">
          <Button type="button" size="sm" className="text-xs rounded-sm" onClick={commit} disabled={saving}>
            {saving ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : null} Guardar
          </Button>
          <Button type="button" size="sm" variant="ghost" className="text-xs rounded-sm" onClick={() => setEditing(false)} disabled={saving}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      <div className={className}>{value || placeholder || "—"}</div>
      {!disabled && (
        <div className="print:hidden mt-1 flex gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
          <button type="button" onClick={startEdit} className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
            <Pencil className="h-3 w-3" /> Editar
          </button>
          {hasEdit && (
            <button type="button" onClick={onReset} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive hover:underline">
              <RotateCcw className="h-3 w-3" /> Repor texto original
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Protocolo/Execução Cirúrgica — novos campos estruturados ────────────────
const SEGMENTATION_TYPE_LABELS: Record<string, string> = { expansao: "Expansão", contracao: "Contração" };
const SIDE_LABELS: Record<string, string> = { D: "Direito", E: "Esquerdo", bilateral: "Bilateral" };
const IMPLANT_REGION_LABELS: Record<string, string> = { malar: "Malar", mandibular: "Mandibular", mento: "Mento", outra: "Outra" };
const IMPLANT_MATERIAL_LABELS: Record<string, string> = { titanio: "Titânio", outro: "Outro" };

function StructuredComplements({ lab, lang = "pt" }: { lab: LabPrediction; lang?: DocLang }) {
  const mx = lab.maxillaComplement;
  const md = lab.mandibleComplement;
  const chin = lab.chinComplement;
  const nasal = lab.nasalComplement;
  const implants = lab.alloplasticImplants ?? [];
  const other = lab.otherProcedures;

  const rows: Array<{ region: string; detail: string }> = [];

  if (mx && (mx.segmentationParts || mx.segmentationType || mx.notes)) {
    const parts: string[] = [];
    if (mx.segmentationParts) parts.push(`Segmentação em ${mx.segmentationParts} partes`);
    if (mx.segmentationType) parts.push(SEGMENTATION_TYPE_LABELS[mx.segmentationType] || mx.segmentationType);
    if (mx.notes) parts.push(mx.notes);
    if (parts.length) rows.push({ region: "Maxila", detail: parts.join(" • ") });
  }
  if (md && (md.atmProsthesis || md.ridgePlastySide || md.ridgePlastyDescription || md.notes)) {
    const parts: string[] = [];
    if (md.atmProsthesis) parts.push("Prótese ATM");
    if (md.ridgePlastySide || md.ridgePlastyDescription) {
      parts.push(`Plastia de crista${md.ridgePlastySide ? ` (${SIDE_LABELS[md.ridgePlastySide] || md.ridgePlastySide})` : ""}${md.ridgePlastyDescription ? ` — ${md.ridgePlastyDescription}` : ""}`);
    }
    if (md.notes) parts.push(md.notes);
    if (parts.length) rows.push({ region: "Mandíbula", detail: parts.join(" • ") });
  }
  if (chin && (chin.mentoplasty || chin.notes)) {
    const parts: string[] = [];
    if (chin.mentoplasty) parts.push("Mentoplastia");
    if (chin.notes) parts.push(chin.notes);
    if (parts.length) rows.push({ region: "Mento", detail: parts.join(" • ") });
  }
  if (nasal && (nasal.septumDeviationSide || nasal.vomerianSpurSide || nasal.turbinates || nasal.notes)) {
    const parts: string[] = [];
    if (nasal.septumDeviationSide) parts.push(`Desvio do septo (${SIDE_LABELS[nasal.septumDeviationSide] || nasal.septumDeviationSide})`);
    if (nasal.vomerianSpurSide) parts.push(`Esporão vomeriano (${SIDE_LABELS[nasal.vomerianSpurSide] || nasal.vomerianSpurSide})`);
    if (nasal.turbinates) parts.push("Cornetos");
    if (nasal.notes) parts.push(nasal.notes);
    if (parts.length) rows.push({ region: "Nariz", detail: parts.join(" • ") });
  }

  if (rows.length === 0 && implants.length === 0 && !other) return null;

  return (
    <div className="mt-4">
      <div className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">{t("compl.byRegion", lang)}</div>
      {rows.length > 0 && (
        <table className="w-full text-xs border-collapse border border-gray-300 mb-3">
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                <td className="border border-gray-300 px-2 py-1 font-semibold w-28 align-top">{r.region}</td>
                <td className="border border-gray-300 px-2 py-1">{r.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {implants.length > 0 && (
        <div className="mb-3">
          <div className="text-[11px] font-semibold text-gray-600 mb-1">{t("compl.alloplastic", lang)}</div>
          <table className="w-full text-xs border-collapse border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="border border-gray-300 px-2 py-1 text-left">{t("compl.region", lang)}</th>
                <th className="border border-gray-300 px-2 py-1 text-left">{t("compl.side", lang)}</th>
                <th className="border border-gray-300 px-2 py-1 text-left">{t("compl.material", lang)}</th>
                <th className="border border-gray-300 px-2 py-1 text-center">CAD/CAM</th>
                <th className="border border-gray-300 px-2 py-1 text-left">{t("compl.brandRef", lang)}</th>
                <th className="border border-gray-300 px-2 py-1 text-left">{t("compl.lot", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {implants.map((im, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="border border-gray-300 px-2 py-1">{im.region ? (IMPLANT_REGION_LABELS[im.region] || im.region) : "—"}</td>
                  <td className="border border-gray-300 px-2 py-1">{im.side ? (SIDE_LABELS[im.side] || im.side) : "—"}</td>
                  <td className="border border-gray-300 px-2 py-1">{im.material ? (IMPLANT_MATERIAL_LABELS[im.material] || im.material) : "—"}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{im.customMade ? "✓" : "—"}</td>
                  <td className="border border-gray-300 px-2 py-1">{im.brandReference || "—"}</td>
                  <td className="border border-gray-300 px-2 py-1 font-mono">{im.lot || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {other && (
        <div className="text-xs">
          <span className="font-semibold text-gray-600">{t("compl.other", lang)}:</span>{" "}
          <span className="whitespace-pre-wrap">{other}</span>
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function ProtocolPrint() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";

  const { data: protocol, isLoading } = useGetProtocol(Number(id), {
    query: { enabled: !isNew, queryKey: ['getProtocol', Number(id)] }
  });

  const { data: planningImages = [] } = useListPlanningImages(Number(id), {}, {
    query: { enabled: !isNew, queryKey: ['planningImages', Number(id)] }
  });

  const { data: files3d = [] } = useListFiles3d(Number(id), {
    query: { enabled: !isNew, queryKey: getListFiles3dQueryKey(Number(id)) }
  });

  const queryClient = useQueryClient();
  const { mutateAsync: updateProtocol } = useUpdateProtocol();
  const { mutateAsync: translateDocument, isPending: isTranslating } = useTranslateDocument();
  const { mutateAsync: requestUpload } = useRequestUploadUrl();

  // Seleção de secções — nunca imprimir tudo automaticamente:
  // começa vazia; o utilizador escolhe um preset ou marca as secções.
  const [sel, setSel] = useState<Record<SectionKey, boolean>>(emptySelection);
  const [docStyle, setDocStyle] = useState<DocStyle>("protocolo");
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [language, setLanguage] = useState<DocLang>("pt");

  // Seleção individual de fotografias no documento — NENHUMA por omissão.
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Record<number, boolean>>({});
  const [includeHeaderPhoto, setIncludeHeaderPhoto] = useState(false);
  const [savingEditKey, setSavingEditKey] = useState<string | null>(null);

  const applyPreset = (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const next = emptySelection();
    preset.sections.forEach((k) => { next[k] = true; });
    setSel(next);
    setDocStyle(preset.style);
    setActivePreset(presetId);
  };

  const toggleSection = (key: SectionKey) => {
    setSel((prev) => ({ ...prev, [key]: !prev[key] }));
    setActivePreset(null);
  };

  const selectedCount = ALL_KEYS.filter((k) => sel[k]).length;
  const isNota = docStyle === "nota_cdf" || docStyle === "nota_bloco";

  const CLINICAL_PHOTO_CATEGORIES = ["foto_extraoral", "foto_intraoral", "foto_clinica_outra"];
  const CLINICAL_PHOTO_LABELS: Record<string, string> = {
    foto_extraoral: "Extraoral",
    foto_intraoral: "Intraoral",
    foto_clinica_outra: "Outra",
  };
  const FILE_3D_TYPE_LABELS: Record<string, string> = {
    scanner_intraoral: "Scanner Intraoral",
    modelo_dentario: "Modelo Dentário",
    maxila: "Maxila",
    mandibula: "Mandíbula",
    cranio: "Crânio Completo",
    splint: "Splint / Goteira",
    guia_cirurgica: "Guia Cirúrgica",
    outro: "Outro",
  };

  // PDFs não podem ser embebidos como <img> — excluir do relatório impresso
  const isPdfDoc = (img: { originalName?: string | null; objectPath?: string | null }) =>
    !!(img.originalName?.toLowerCase().endsWith(".pdf") || img.objectPath?.toLowerCase().endsWith(".pdf"));
  // Fotografia de identificação (cabeçalho): checkbox própria, desmarcada por omissão.
  const headerPhotoCandidate = planningImages.find(img => img.isHeaderPhoto && !isPdfDoc(img));
  const headerPhoto = includeHeaderPhoto ? headerPhotoCandidate : undefined;

  // Todas as fotografias que hoje podem sair no documento (excl. PDFs e a de identificação).
  const selectablePhotos = useMemo(
    () => planningImages.filter(img => !isPdfDoc(img) && !img.isHeaderPhoto),
    [planningImages],
  );
  // Só as escolhidas entram no documento — nenhuma marcada por omissão.
  const clinicalPhotos = selectablePhotos.filter(
    img => selectedPhotoIds[img.id] && CLINICAL_PHOTO_CATEGORIES.includes(img.category)
  );
  const pdfImages = selectablePhotos.filter(
    img => selectedPhotoIds[img.id] && !CLINICAL_PHOTO_CATEGORIES.includes(img.category)
  );
  const pdfFiles3d = files3d.filter(f => f.includeInPdf);
  const piezo = protocol?.piezoEquipment;
  const piezoUsed = piezo && piezo.brand && piezo.brand !== "nao_utilizado";
  const diagrams = protocol?.surgicalDiagrams;
  const printedDiagrams = DIAGRAMS.filter((d) => {
    const a = diagrams?.[d.id];
    if (!a || a.includeInPdf === false) return false;
    const hasLines = a.lines && Object.values(a.lines).some(Boolean);
    const hasStrokes = (a.strokes?.length ?? 0) > 0;
    return hasLines || hasStrokes;
  });
  const isDemo = protocol?.processNumber?.startsWith("DEMO-") ?? false;

  if (isLoading) {
    return <div className="p-12 max-w-4xl mx-auto"><Skeleton className="h-64 w-full" /></div>;
  }

  if (!protocol) {
    return <div className="p-12 text-center">Protocolo não encontrado.</div>;
  }

  const handlePrint = () => {
    if (selectedCount === 0) return;
    window.print();
  };

  const invalidateProtocol = () => {
    queryClient.invalidateQueries({ queryKey: ['getProtocol', Number(id)] });
  };

  // ── documentEdits: chave "${docStyle}:${language}:${blockKey}" ──
  const docEdits = (protocol.documentEdits ?? {}) as Record<string, unknown>;
  const editKey = (blockKey: string) => `${docStyle}:${language}:${blockKey}`;
  const getEdit = (blockKey: string): string | undefined => {
    const v = docEdits[editKey(blockKey)];
    return typeof v === "string" ? v : undefined;
  };
  // Texto a mostrar: edição gravada tem prioridade sobre o texto derivado.
  const resolveText = (blockKey: string, derived: string): string => getEdit(blockKey) ?? derived;
  const hasEdit = (blockKey: string): boolean => getEdit(blockKey) !== undefined;

  // O servidor faz merge por chave: cada chave enviada é upsert; valor null
  // APAGA a chave. Enviar apenas as chaves afetadas evita apagar edições de
  // outros blocos/idiomas gravadas em paralelo.
  const mergeEdits = async (patch: Record<string, unknown>) => {
    await updateProtocol({ id: Number(id), data: { documentEdits: patch } });
    invalidateProtocol();
  };

  const saveEdit = async (blockKey: string, text: string) => {
    const key = editKey(blockKey);
    setSavingEditKey(key);
    try {
      await mergeEdits({ [key]: text });
    } catch {
      toast.error("Não foi possível guardar a edição.");
    } finally {
      setSavingEditKey(null);
    }
  };

  const resetEdit = async (blockKey: string) => {
    const key = editKey(blockKey);
    try {
      // null apaga a chave no servidor
      await mergeEdits({ [key]: null });
    } catch {
      toast.error("Não foi possível repor o texto original.");
    }
  };

  // ── Assinatura ──
  const uploadSignatureBlob = async (blob: Blob, name: string, contentType: string) => {
    const { uploadURL, objectPath } = await requestUpload({
      data: { name, size: blob.size, contentType },
    });
    await fetch(uploadURL, { method: "PUT", body: blob, headers: { "Content-Type": contentType } });
    await updateProtocol({
      id: Number(id),
      data: { signatureImagePath: objectPath },
    });
    invalidateProtocol();
  };

  const handleSignatureDataUrl = async (dataUrl: string) => {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      await uploadSignatureBlob(blob, "assinatura.png", "image/png");
      toast.success("Assinatura guardada.");
    } catch {
      toast.error("Erro ao guardar a assinatura.");
    }
  };

  const handleSignatureFile = async (file: File) => {
    try {
      await uploadSignatureBlob(file, file.name, resolveContentType(file));
      toast.success("Assinatura carregada.");
    } catch {
      toast.error("Erro ao carregar a assinatura.");
    }
  };

  const handleSignatureClear = async () => {
    try {
      await updateProtocol({ id: Number(id), data: { signatureImagePath: "" } });
      invalidateProtocol();
    } catch {
      toast.error("Erro ao remover a assinatura.");
    }
  };

  const handleRepresentativeChange = async (value: string) => {
    try {
      await updateProtocol({ id: Number(id), data: { signatureRepresentative: value } });
      invalidateProtocol();
    } catch {
      toast.error("Erro ao guardar o nome do representante.");
    }
  };

  const signatureUrl = protocol.signatureImagePath ? "/api/storage" + protocol.signatureImagePath : null;

  const checkStatusLabel = {
    [ChecklistItemStatus.ok]: t("check.status.ok", language),
    [ChecklistItemStatus.missing]: t("check.status.missing", language),
    [ChecklistItemStatus.na]: t("check.status.na", language)
  };

  const plates = protocol.materials?.plates ?? [];
  const drills = protocol.materials?.drills ?? [];
  const saws   = protocol.materials?.saws   ?? [];
  const duration = stayDuration(protocol.admissionDateTime, protocol.dischargeDateTime, language);
  const diagText = diagnosisNarrative(protocol.preopDiagnosis);

  const docTitle =
    docStyle === "nota_cdf" ? t("doc.nota", language)
    : docStyle === "nota_bloco" ? t("doc.nota", language)
    : docStyle === "relatorio" ? t("doc.relatorio", language)
    : t("doc.protocolo", language);
  const isRelatorio = docStyle === "relatorio";
  const medicalActs = deriveMedicalActs(protocol.surgicalPlan);
  const surgeonOm = protocol.team?.surgeonOmNumber || "21892";
  const surgeonName = protocol.team?.surgeon || "Dr. Matos da Fonseca";

  // ── Blocos partilhados ──
  const identificationBlock = sel.identification && (
    <PrintSection title={t("sec.identification", language)}>
      <div className="flex gap-4 items-start">
        {headerPhoto && !isNota && (
          <img
            src={headerPhoto.servingUrl}
            alt="Fotografia do doente"
            className="w-28 h-28 object-cover border border-gray-300 flex-shrink-0"
          />
        )}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm flex-1">
          <div><span className="font-semibold text-gray-600">{t("id.name", language)}:</span> {protocol.patientName}</div>
          <div>
            <span className="font-semibold text-gray-600">{t("id.ageSex", language)}:</span> {protocol.patientAge || "-"} {t("id.years", language)} / {protocol.patientGender === "M" ? t("sex.male", language) : protocol.patientGender === "F" ? t("sex.female", language) : "-"}
          </div>
          <div><span className="font-semibold text-gray-600">{t("id.processNo", language)}:</span> {protocol.processNumber}</div>
          {protocol.utenteNumber && <div><span className="font-semibold text-gray-600">{t("id.utenteNo", language)}:</span> {protocol.utenteNumber}</div>}
          {protocol.citizenCardNumber && <div><span className="font-semibold text-gray-600">{t("id.citizenCardNo", language)}:</span> {protocol.citizenCardNumber}</div>}
          <div className="col-span-2"><span className="font-semibold text-gray-600">{t("id.procedure", language)}:</span> <span className="font-bold">{protocol.surgeryType}</span></div>
        </div>
      </div>
    </PrintSection>
  );

  const surgeryDataBlock = sel.surgeryData && (isRelatorio ? (
    // Estrutura do Relatório Clínico para seguradoras (modelos CL II / CL III)
    <PrintSection title={t("sec.surgeryData.relatorio", language)}>
      <div className="text-sm leading-relaxed font-serif space-y-1">
        <p><span className="font-semibold">{t("surg.interventionDate", language)}</span> — {protocol.surgeryDate ? format(new Date(protocol.surgeryDate), "dd/MM/yyyy") : t("surg.interventionDate.tbd", language)}</p>
        <p><span className="font-semibold">{t("surg.interventionLocation", language)}</span> — {protocol.hospital || t("surg.interventionLocation.tbd", language)}</p>
        <p><span className="font-semibold">{t("surg.expectedStay", language)}</span> — {protocol.expectedStay || t("surg.expectedStay.default", language)}</p>
      </div>
    </PrintSection>
  ) : (
    <PrintSection title={t("sec.surgeryData", language)}>
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
        {protocol.hospital && <div><span className="font-semibold text-gray-600">{t("surg.hospital", language)}:</span> {protocol.hospital}</div>}
        <div><span className="font-semibold text-gray-600">{t("surg.surgeryDate", language)}:</span> {protocol.surgeryDate ? format(new Date(protocol.surgeryDate), "dd/MM/yyyy") : "—"}</div>
        <div><span className="font-semibold text-gray-600">{t("surg.surgeon", language)}:</span> {protocol.team?.surgeon || "A. Matos da Fonseca"}</div>
        {protocol.expectedStay && <div><span className="font-semibold text-gray-600">{t("surg.expectedStayShort", language)}:</span> {protocol.expectedStay}</div>}
        <div><span className="font-semibold text-gray-600">{t("surg.admission", language)}:</span> {fmtDateTime(protocol.admissionDateTime, language)}</div>
        <div><span className="font-semibold text-gray-600">{t("surg.discharge", language)}:</span> {fmtDateTime(protocol.dischargeDateTime, language)}</div>
        {duration && <div><span className="font-semibold text-gray-600">{t("surg.stayDuration", language)}:</span> {duration}</div>}
      </div>
    </PrintSection>
  ));

  const medicalActsBlock = sel.medicalActs && (
    <PrintSection title={t("sec.medicalActs", language)}>
      <div className="text-sm leading-relaxed font-serif">
        <p className="mb-2">
          {t("acts.intro", language)}
        </p>
        {medicalActs.length > 0 ? (
          <table className="w-full text-sm border-collapse">
            <tbody>
              {medicalActs.map((a) => (
                <tr key={a.code}>
                  <td className="py-0.5 pr-4 font-mono whitespace-nowrap align-top">{a.code}</td>
                  <td className="py-0.5 pr-4">{a.name}</td>
                  <td className="py-0.5 font-semibold whitespace-nowrap text-right">{a.k}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500 italic">{t("acts.empty", language)}</p>
        )}
      </div>
    </PrintSection>
  );

  const nextAppointmentBlock = sel.nextAppointment && (protocol.nextAppointmentDate || protocol.nextAppointmentTime) && (
    <PrintSection title={t("sec.nextAppointment", language)}>
      <div className="text-sm">
        {protocol.nextAppointmentDate ? format(new Date(protocol.nextAppointmentDate), "dd/MM/yyyy") : ""}
        {protocol.nextAppointmentTime ? ` ${t("common.at", language)} ${protocol.nextAppointmentTime}` : ""}
        {` — ${protocol.nextAppointmentLocation || "Clínica da Face"}`}
      </div>
    </PrintSection>
  );

  const editProps = (blockKey: string) => ({
    hasEdit: hasEdit(blockKey),
    onSave: (text: string) => saveEdit(blockKey, text),
    onReset: () => resetEdit(blockKey),
    saving: savingEditKey === editKey(blockKey),
  });

  const recommendationsDerived = protocol.postopRecommendations || "";
  const recommendationsText = resolveText("recommendations", recommendationsDerived);
  const recommendationsBlock = sel.recommendations && recommendationsText && (
    <PrintSection title={isNota ? t("sec.recommendations.nota", language) : t("sec.recommendations", language)}>
      <EditableText
        value={recommendationsText}
        className="text-sm leading-relaxed whitespace-pre-wrap font-serif"
        {...editProps("recommendations")}
      />
    </PrintSection>
  );

  const homeMedicationText = resolveText("homeMedication", protocol.homeMedication || "");
  const homeMedicationBlock = sel.homeMedication && homeMedicationText && (
    <PrintSection title={t("sec.homeMedication", language)}>
      <EditableText
        value={homeMedicationText}
        className="text-sm leading-relaxed whitespace-pre-wrap font-serif"
        {...editProps("homeMedication")}
      />
    </PrintSection>
  );

  // Cirurgia virtual / guias cirúrgicas surgem sempre no FIM do relato.
  const operativeDerived = reorderOperativeDescription(protocol.operativeDescription) || "Nenhum descritivo operatório registado.";
  const operativeText = resolveText("operativeReport", operativeDerived);
  const operativeTitle = isNota
    ? (docStyle === "nota_bloco" ? t("sec.operativeReport.nota_bloco", language) : t("sec.operativeReport.nota", language))
    : t("sec.operativeReport", language);
  const operativeReportBlock = sel.operativeReport && (
    <PrintSection title={operativeTitle}>
      <EditableText
        value={operativeText}
        className="text-sm leading-relaxed whitespace-pre-wrap font-serif text-justify"
        {...editProps("operativeReport")}
      />
    </PrintSection>
  );

  const summaryDerived = [
    `Doente submetido(a) a ${protocol.surgeryType || "cirurgia ortognática"} sob anestesia geral.`,
    duration ? `Internamento com a duração de ${duration}.` : "",
    protocol.nextAppointmentDate
      ? `Próxima consulta: ${format(new Date(protocol.nextAppointmentDate), "dd/MM/yyyy")}${protocol.nextAppointmentTime ? ` às ${protocol.nextAppointmentTime}` : ""} — ${protocol.nextAppointmentLocation || "Clínica da Face"}.`
      : "",
  ].filter(Boolean).join("\n");
  const summaryText = resolveText("summary", summaryDerived);
  const summaryBlock = sel.summary && (
    <PrintSection title={t("sec.summary", language)}>
      <EditableText
        value={summaryText}
        className="text-sm leading-relaxed whitespace-pre-wrap font-serif"
        {...editProps("summary")}
      />
    </PrintSection>
  );

  const internalNotesText = resolveText("internalNotes", protocol.postopNotes || "");

  // O texto do Construtor de Diagnóstico (editável pelo cirurgião) tem
  // prioridade; sem ele, usa-se o resumo gerado dos campos estruturados.
  const narrativeDerived = protocol.preopDiagnosis?.diagnosisNarrative?.trim() || diagText;
  const narrativeText = resolveText("diagnosis", narrativeDerived);
  const diagnosisBlock = sel.diagnosis && narrativeText && (
    <PrintSection title={t("sec.diagnosis", language)}>
      <EditableText
        value={narrativeText}
        className="text-sm leading-relaxed whitespace-pre-wrap font-serif"
        {...editProps("diagnosis")}
      />
    </PrintSection>
  );

  // Texto livre do plano cirúrgico (parte nasal) — traduzível.
  const nasalNotesDerived = ((protocol.surgicalPlan as any)?.nasalNotes as string | undefined) || "";
  const nasalNotesText = resolveText("nasalNotes", nasalNotesDerived);

  // Avisos clínicos (texto livre do diagnóstico) — só em documentos internos.
  const clinicalAlertsDerived = protocol.preopDiagnosis?.clinicalAlerts || "";
  const clinicalAlertsText = resolveText("clinicalAlerts", clinicalAlertsDerived);

  // ── Tradução do documento (EN/ES) ──
  // Blocos de texto traduzíveis e respetivo texto-fonte em PT (texto derivado).
  const TRANSLATABLE_DERIVED: Array<{ blockKey: string; text: string; selected: boolean }> = [
    { blockKey: "diagnosis", text: narrativeDerived, selected: sel.diagnosis },
    { blockKey: "clinicalAlerts", text: clinicalAlertsDerived, selected: sel.diagnosis && !isNota && !isRelatorio },
    { blockKey: "operativeReport", text: operativeDerived, selected: sel.operativeReport },
    { blockKey: "recommendations", text: recommendationsDerived, selected: sel.recommendations },
    { blockKey: "homeMedication", text: protocol.homeMedication || "", selected: sel.homeMedication },
    { blockKey: "summary", text: summaryDerived, selected: sel.summary },
    { blockKey: "internalNotes", text: protocol.postopNotes || "", selected: sel.internalNotes },
    { blockKey: "nasalNotes", text: nasalNotesDerived, selected: sel.plan },
  ];

  const handleTranslate = async () => {
    if (language === "pt") return;
    const texts = TRANSLATABLE_DERIVED
      .filter((b) => b.selected && b.text.trim())
      .map((b) => ({ key: b.blockKey, text: b.text }));
    if (texts.length === 0) {
      toast.info("Não há blocos de texto visíveis para traduzir.");
      return;
    }
    // Se já existirem textos traduzidos/editados neste idioma para os blocos a
    // traduzir, confirma antes de substituir.
    const hasExisting = texts.some((tx) => {
      const v = docEdits[`${docStyle}:${language}:${tx.key}`];
      return typeof v === "string" && v.trim().length > 0;
    });
    if (hasExisting && !window.confirm("Já existem textos traduzidos/editados neste idioma — substituir? Os atuais serão perdidos.")) {
      return;
    }
    try {
      const result = await translateDocument({ id: Number(id), data: { language, texts } });
      // Merge por chave: envia apenas as chaves traduzidas.
      const patch: Record<string, unknown> = {};
      for (const tr of result.translations) {
        patch[`${docStyle}:${language}:${tr.key}`] = tr.text;
      }
      await mergeEdits(patch);
      toast.success("Documento traduzido. Pode rever e editar cada bloco.");
    } catch {
      toast.error("Não foi possível traduzir o documento.");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Painel de seleção — oculto na impressão */}
      <div className="print:hidden bg-sidebar p-4 flex justify-between items-center sticky top-0 z-10 shadow-md">
        <Button variant="ghost" asChild className="text-white hover:text-white/80 hover:bg-white/10 uppercase tracking-widest rounded-sm">
          <Link href={`/protocols/${id}`}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Voltar ao Editor
          </Link>
        </Button>
        <Button
          onClick={handlePrint}
          disabled={selectedCount === 0}
          className="bg-white text-sidebar hover:bg-white/90 uppercase tracking-widest rounded-sm disabled:opacity-50"
        >
          <Printer className="mr-2 h-4 w-4" /> Imprimir / PDF
        </Button>
      </div>

      <div className="print:hidden max-w-[210mm] mx-auto px-4 md:px-12 pt-8">
        <div className="border border-border rounded-sm p-6 bg-muted/20">
          <div className="text-sm font-bold uppercase tracking-widest text-primary mb-1">Documento a gerar</div>
          <p className="text-xs text-muted-foreground mb-4">
            Escolha um modelo ou selecione manualmente as secções a incluir. Nada é incluído automaticamente.
          </p>
          <div className="flex flex-wrap gap-2 mb-5">
            {PRESETS.map((p) => (
              <Button
                key={p.id}
                variant={activePreset === p.id ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => applyPreset(p.id)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
            {SECTION_DEFS.map((s) => (
              <label key={s.key} className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={!!sel[s.key]} onCheckedChange={() => toggleSection(s.key)} />
                {s.label}
              </label>
            ))}
          </div>
          {selectedCount === 0 && (
            <p className="text-xs text-amber-700 mt-4 font-semibold">
              Selecione pelo menos uma secção para pré-visualizar e imprimir.
            </p>
          )}
        </div>

        {/* Idioma do documento + tradução */}
        <div className="border border-border rounded-sm p-6 bg-muted/20 mt-6">
          <div className="text-sm font-bold uppercase tracking-widest text-primary mb-3">Idioma do documento</div>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={language} onValueChange={(v) => setLanguage(v as DocLang)}>
              <SelectTrigger className="w-48 rounded-sm text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt">Português</SelectItem>
                <SelectItem value="en">Inglês</SelectItem>
                <SelectItem value="es">Espanhol</SelectItem>
              </SelectContent>
            </Select>
            {language !== "pt" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs rounded-sm"
                onClick={handleTranslate}
                disabled={isTranslating || selectedCount === 0}
              >
                {isTranslating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Languages className="mr-1.5 h-3.5 w-3.5" />}
                Traduzir documento
              </Button>
            )}
          </div>
          {language !== "pt" && (
            <p className="text-[11px] text-muted-foreground mt-2">
              As traduções ficam gravadas e editáveis por bloco. PT mantém o comportamento atual.
            </p>
          )}
        </div>

        {/* Fotografias no documento */}
        {(selectablePhotos.length > 0 || headerPhotoCandidate) && (
          <div className="border border-border rounded-sm p-6 bg-muted/20 mt-6">
            <div className="text-sm font-bold uppercase tracking-widest text-primary mb-1">Fotografias no documento</div>
            <p className="text-xs text-muted-foreground mb-4">Nenhuma é incluída por omissão — selecione as que pretende no documento.</p>

            {headerPhotoCandidate && (
              <label className="flex items-center gap-3 text-xs cursor-pointer mb-4 pb-4 border-b border-border/60">
                <Checkbox checked={includeHeaderPhoto} onCheckedChange={() => setIncludeHeaderPhoto((v) => !v)} />
                <img src={headerPhotoCandidate.servingUrl} alt="Identificação" className="w-12 h-12 object-cover border border-border rounded-sm" />
                <span>Foto de identificação no documento</span>
              </label>
            )}

            {selectablePhotos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {selectablePhotos.map((img) => (
                  <label key={img.id} className="flex items-start gap-2 text-[11px] cursor-pointer border border-border/60 rounded-sm p-2">
                    <Checkbox
                      checked={!!selectedPhotoIds[img.id]}
                      onCheckedChange={() => setSelectedPhotoIds((prev) => ({ ...prev, [img.id]: !prev[img.id] }))}
                    />
                    <div className="flex-1 min-w-0">
                      <img src={img.servingUrl} alt={img.caption || img.originalName || "Fotografia"} className="w-full h-20 object-cover border border-border rounded-sm mb-1" />
                      <div className="truncate text-muted-foreground">{img.caption || img.originalName || CLINICAL_PHOTO_LABELS[img.category] || img.category.replace(/_/g, " ")}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Assinatura */}
        <div className="mt-6">
          <SignatureBlockEditor
            representative={protocol.signatureRepresentative || ""}
            onRepresentativeCommit={handleRepresentativeChange}
            signatureImageUrl={signatureUrl}
            onUploadDataUrl={handleSignatureDataUrl}
            onUploadFile={handleSignatureFile}
            onClearImage={handleSignatureClear}
          />
        </div>
        {selectedCount > 0 && (
          <div className="text-xs uppercase tracking-widest text-muted-foreground mt-6 mb-2">Pré-visualização</div>
        )}
      </div>

      {/* Documento */}
      {selectedCount > 0 && (
      <div className="max-w-[210mm] mx-auto bg-white p-12 text-black print:p-0 print:m-0 border border-border/50 print:border-0 mb-12 print:mb-0 shadow-sm print:shadow-none" id="print-document">

        {/* ── DEMO BANNER ──────────────────────────────────────────── */}
        {isDemo && (
          <div className="mb-6 border-2 border-red-400 bg-red-50 p-3 flex items-start gap-3 rounded-sm print:border-red-400 print:bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold uppercase tracking-widest text-red-700">⚠ {t("demo.headerTitle", language)}</div>
              <div className="text-xs text-red-600 mt-0.5">
                {t("demo.headerBody", language)}
              </div>
            </div>
          </div>
        )}

        {/* Cabeçalho com logótipo */}
        <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
          <div>
            <img src={logo} alt="Clínica da Face" className="h-16 object-contain" />
            <div className="mt-2 text-xs text-gray-600 font-serif">{t("hdr.tagline1", language)}</div>
            <div className="text-xs text-gray-500 font-serif">{t("hdr.surgeonLine", language)}</div>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold uppercase tracking-widest text-primary">{docTitle}</h1>
            {sel.identification && <div className="text-sm mt-1 text-gray-600">{t("hdr.processNo", language)} {protocol.processNumber}</div>}
            {sel.surgeryData && <div className="text-sm mt-1">{t("hdr.date", language)}: {protocol.surgeryDate ? format(new Date(protocol.surgeryDate), "dd/MM/yyyy") : "___/___/_____"}</div>}
            {isDemo && (
              <div className="mt-1 text-xs font-bold text-red-600 uppercase tracking-widest">⚠ {t("demo.badge", language)}</div>
            )}
          </div>
        </div>

        {identificationBlock}
        {/* No Relatório Clínico o diagnóstico vem antes da Terapêutica (modelos CL II/III) */}
        {isRelatorio ? diagnosisBlock : surgeryDataBlock}

        {/* Avisos importantes — apenas em documentos internos */}
        {!isNota && !isRelatorio && sel.diagnosis && clinicalAlertsText && (
          <div className="mb-8 border-2 border-red-500 bg-red-50 p-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-red-700 mb-2">⚠ {t("sec.alerts", language)}</h2>
            <div className="text-sm font-semibold text-red-900 whitespace-pre-wrap">
              {clinicalAlertsText}
            </div>
          </div>
        )}

        {isRelatorio ? surgeryDataBlock : diagnosisBlock}

        {medicalActsBlock}

        {sel.team && isRelatorio && (
          <PrintSection title={t("sec.teamShort", language)}>
            <div className="text-sm leading-relaxed font-serif space-y-1">
              <p>{t("team.composition", language)}</p>
              <p>{t("team.lead", language)}: {surgeonName} – {t("team.omNo", language)} {surgeonOm}</p>
            </div>
          </PrintSection>
        )}

        {sel.team && !isRelatorio && (
          <PrintSection title={t("sec.team", language)}>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div><span className="font-semibold text-gray-600">{t("team.surgeon", language)}:</span> {protocol.team?.surgeon || "-"}</div>
              <div><span className="font-semibold text-gray-600">{t("team.anesthesiologist", language)}:</span> {protocol.team?.anesthesiologist || "-"}</div>
              <div><span className="font-semibold text-gray-600">{t("team.firstAssistant", language)}:</span> {protocol.team?.firstAssistant || "-"}</div>
              <div><span className="font-semibold text-gray-600">{t("team.instrumentist", language)}:</span> {protocol.team?.instrumentist || "-"}</div>
              <div><span className="font-semibold text-gray-600">{t("team.secondAssistant", language)}:</span> {protocol.team?.secondAssistant || "-"}</div>
              <div><span className="font-semibold text-gray-600">{t("team.circulating", language)}:</span> {protocol.team?.scrubNurse || "-"}</div>
            </div>
          </PrintSection>
        )}

        {sel.labPrediction && protocol.labPrediction && <LabPredictionPrint lab={protocol.labPrediction} lang={language} />}

        {sel.checklist && (protocol.checklist?.length ?? 0) > 0 && (
          <PrintSection title={t("sec.checklist", language)}>
            <table className="w-full text-xs border-collapse border border-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border border-gray-300 px-2 py-1 text-left">{t("col.item", language)}</th>
                  <th className="border border-gray-300 px-2 py-1 text-center w-20">{t("col.status", language)}</th>
                  <th className="border border-gray-300 px-2 py-1 text-left">{t("col.notes", language)}</th>
                </tr>
              </thead>
              <tbody>
                {protocol.checklist!.map((item, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="border border-gray-300 px-2 py-1">{item.item}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center font-semibold">{checkStatusLabel[item.status] ?? item.status}</td>
                    <td className="border border-gray-300 px-2 py-1 text-gray-600">{item.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PrintSection>
        )}

        {sel.prepChecklist && (
          <PrintSection title={t("sec.prepChecklist", language)}>
            <div className="text-xs mb-3 flex flex-wrap gap-x-6 gap-y-1">
              <span>
                <span className="font-semibold">{t("prep.appliance", language)}:</span>{" "}
                {protocol.orthoAppliance
                  ? prepI18n(`appliance.${protocol.orthoAppliance}`, language, APPLIANCE_LABELS[protocol.orthoAppliance as Appliance] ?? protocol.orthoAppliance)
                  : "—"}
              </span>
              <span>
                <span className="font-semibold">{t("prep.segmentation", language)}:</span>{" "}
                {prepI18n(
                  `seg.${(protocol.preparation?.segmentation as Segmentation) || "undecided"}`,
                  language,
                  SEGMENTATION_LABELS[(protocol.preparation?.segmentation as Segmentation) || "undecided"],
                )}
              </span>
              {(() => {
                const ctxP = buildPrepContext(protocol.orthoAppliance, protocol.preparation);
                const { deadline } = computeActivationDeadline(protocol.surgeryDate, ctxP.appliance, protocol.preparation);
                return deadline ? (
                  <span>
                    <span className="font-semibold">{t("prep.deadline", language)}:</span> {deadline}
                  </span>
                ) : null;
              })()}
            </div>
            {(() => {
              const ctxP = buildPrepContext(protocol.orthoAppliance, protocol.preparation);
              return PREP_BLOCKS.map((block) => (
                <div key={block.key} className="mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-1">{prepI18n(`block.${block.key}`, language, block.title)}</h3>
                  <table className="w-full text-xs border-collapse border border-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border border-gray-300 px-2 py-1 text-left">{t("col.item", language)}</th>
                        <th className="border border-gray-300 px-2 py-1 text-center w-28">{t("col.status", language)}</th>
                        <th className="border border-gray-300 px-2 py-1 text-left">{t("col.notes", language)}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {block.items.map((def, i) => {
                        const stored = protocol.preparation?.items?.find((it) => it.key === def.key);
                        const status = effectiveItemStatus(def, ctxP, stored);
                        return (
                          <tr key={def.key} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                            <td className={`border border-gray-300 px-2 py-1 ${status === "na_auto" ? "text-gray-400" : ""}`}>{prepI18n(def.key, language, def.label)}</td>
                            <td className="border border-gray-300 px-2 py-1 text-center font-semibold">{t(`prep.status.${status}`, language)}</td>
                            <td className="border border-gray-300 px-2 py-1 text-gray-600">
                              {[stored?.detail, stored?.notes].filter(Boolean).join(" — ") || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {protocol.preparation?.blockNotes?.[block.key] && (
                    <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{protocol.preparation.blockNotes[block.key]}</p>
                  )}
                </div>
              ));
            })()}
            {(() => {
              const ctxP = buildPrepContext(protocol.orthoAppliance, protocol.preparation);
              return (
                <div className="mt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-1">{t("prep.products", language)}</h3>
                  <table className="w-full text-xs border-collapse border border-gray-300">
                    <tbody>
                      {PREP_PRODUCTS.map((def, i) => {
                        const stored = protocol.preparation?.products?.find((p) => p.key === def.key);
                        const status = effectiveProductStatus(def, ctxP, stored);
                        return (
                          <tr key={def.key} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                            <td className={`border border-gray-300 px-2 py-1 ${status === "na_auto" ? "text-gray-400" : ""}`}>{prepI18n(`prod.${def.key}`, language, def.label)}</td>
                            <td className="border border-gray-300 px-2 py-1 text-center font-semibold w-32">
                              {status === "na_auto" ? t("prep.status.na_auto", language) : t(`prep.pstatus.${status}`, language)}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-gray-600 w-28">
                              {stored?.updatedAt ? stored.updatedAt.slice(0, 10) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </PrintSection>
        )}

        {sel.patientInstructions && (
          <PrintSection title={t("sec.patientInstructions", language)}>
            <div className="flex items-center gap-4">
              <QRCodeSVG value={INSTRUCTIONS_APP_URL} size={80} />
              <div className="text-sm">
                <p className="mb-1">{t("prep.instructionsIntro", language)}</p>
                <p className="font-mono text-xs">{INSTRUCTIONS_APP_URL}</p>
              </div>
            </div>
          </PrintSection>
        )}

        {sel.plan && protocol.surgicalPlan && <SurgicalPlanPrint plan={protocol.surgicalPlan} lang={language} />}

        {sel.plan && nasalNotesText && (
          <div className="mb-8 border border-amber-400 bg-amber-50 p-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-amber-800 mb-2">{t("sec.nasal", language)}</h2>
            <div className="text-sm whitespace-pre-wrap">{nasalNotesText}</div>
          </div>
        )}

        {sel.sequence && (protocol.surgicalSequence?.length ?? 0) > 0 && (
          <PrintSection title={t("sec.sequence", language)}>
            <ol className="text-sm list-none space-y-1">
              {[...protocol.surgicalSequence!].sort((a, b) => a.order - b.order).map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="font-mono text-gray-500 w-6 text-right shrink-0">{step.order}.</span>
                  <span>
                    {step.description}
                    {(step.startTime || step.endTime) && (
                      <span className="text-gray-500 ml-2 text-xs">({step.startTime || "--:--"} – {step.endTime || "--:--"})</span>
                    )}
                    {step.notes && <span className="text-gray-600 ml-2 text-xs italic">{step.notes}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </PrintSection>
        )}

        {operativeReportBlock}

        {sel.intraop && protocol.intraopRecord && (
          <div className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest bg-gray-100 p-2 mb-4 border-l-4 border-primary">{t("sec.intraop", language)}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm border p-4">
              <div>
                <span className="font-semibold text-gray-600 block mb-1">{t("intraop.anesthesia", language)}</span>
                {t("intraop.start", language)}: {protocol.intraopRecord.anesthesiaStartTime || "--:--"} <br />
                {t("intraop.end", language)}: {protocol.intraopRecord.anesthesiaEndTime || "--:--"}
              </div>
              <div>
                <span className="font-semibold text-gray-600 block mb-1">{t("intraop.surgery", language)}</span>
                {t("intraop.start", language)}: {protocol.intraopRecord.surgeryStartTime || "--:--"} <br />
                {t("intraop.end", language)}: {protocol.intraopRecord.surgeryEndTime || "--:--"}
              </div>
            </div>

            {protocol.intraopRecord.complications && protocol.intraopRecord.complications.length > 0 && (
              <div className="mt-4 text-sm border border-red-200 p-4 bg-red-50">
                <span className="font-bold text-red-800 block mb-2">{t("intraop.complications", language)}</span>
                <ul className="list-disc list-inside pl-4 text-red-900">
                  {protocol.intraopRecord.complications.map((comp, idx) => (
                    <li key={idx}>
                      {comp.description}
                      {comp.action && <span className="text-gray-600 ml-2">({t("intraop.action", language)}: {comp.action})</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {sel.materials && protocol.materials && (plates.length > 0 || drills.length > 0 || saws.length > 0) && (
          <OsteosynthesisPrint plates={plates} drills={drills} saws={saws} lang={language} />
        )}

        {sel.planningImages && pdfImages.length > 0 && (
          <PrintSection title={t("sec.planningImages", language)}>
            <div className="grid grid-cols-3 gap-4">
              {pdfImages.map(img => (
                <div key={img.id} className="border border-gray-200">
                  <img
                    src={img.servingUrl}
                    alt={img.caption || img.originalName || "Imagem"}
                    className="w-full h-36 object-cover"
                  />
                  <div className="p-2">
                    {img.caption && (
                      <p className="text-xs text-gray-700 leading-snug">{img.caption}</p>
                    )}
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">
                      {img.category.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </PrintSection>
        )}

        {sel.clinicalPhotos && clinicalPhotos.length > 0 && (
          <PrintSection title={t("sec.clinicalPhotos", language)}>
            <div className="grid grid-cols-3 gap-4">
              {clinicalPhotos.map(img => (
                <div key={img.id} className="border border-gray-200">
                  <img
                    src={img.servingUrl}
                    alt={img.caption || img.originalName || "Fotografia"}
                    className="w-full h-36 object-cover"
                  />
                  <div className="p-2">
                    {img.caption && <p className="text-xs text-gray-700 leading-snug">{img.caption}</p>}
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">
                      {CLINICAL_PHOTO_LABELS[img.category] || img.category}
                      {img.captureDate ? ` • ${format(new Date(img.captureDate), "dd/MM/yyyy")}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </PrintSection>
        )}

        {sel.files3d && pdfFiles3d.length > 0 && (
          <PrintSection title={t("sec.files3d", language)}>
            <table className="w-full text-xs border-collapse border border-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border border-gray-300 px-2 py-1 text-left">{t("files3d.file", language)}</th>
                  <th className="border border-gray-300 px-2 py-1 text-left">{t("files3d.type", language)}</th>
                  <th className="border border-gray-300 px-2 py-1 text-center">{t("files3d.format", language)}</th>
                  <th className="border border-gray-300 px-2 py-1 text-left">{t("files3d.origin", language)}</th>
                  <th className="border border-gray-300 px-2 py-1 text-center">{t("files3d.date", language)}</th>
                  <th className="border border-gray-300 px-2 py-1 text-center">{t("files3d.version", language)}</th>
                </tr>
              </thead>
              <tbody>
                {pdfFiles3d.map((f, i) => (
                  <tr key={f.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="border border-gray-300 px-2 py-1">{f.originalName || "—"}</td>
                    <td className="border border-gray-300 px-2 py-1">{FILE_3D_TYPE_LABELS[f.fileType] || f.fileType}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center uppercase font-mono">{f.fileFormat}</td>
                    <td className="border border-gray-300 px-2 py-1 text-gray-700">{f.origin || "—"}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{f.fileDate ? format(new Date(f.fileDate), "dd/MM/yyyy") : "—"}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{f.version || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PrintSection>
        )}

        {sel.diagrams && printedDiagrams.length > 0 && (
          <PrintSection title={t("sec.diagrams", language)}>
            <div className="flex flex-wrap gap-6 justify-center">
              {printedDiagrams.map((d) => (
                <SurgicalDiagramStatic key={d.id} diagramId={d.id} value={diagrams![d.id]!} width={240} />
              ))}
            </div>
          </PrintSection>
        )}

        {sel.piezo && piezoUsed && (
          <PrintSection title={t("sec.piezo", language)}>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm border p-4">
              <div><span className="font-semibold text-gray-600">{t("piezo.system", language)}:</span> {piezo!.brand === "wh" ? "W&H (Piezomed)" : piezo!.brand === "mectron" ? "Mectron (Piezosurgery)" : t("piezo.otherManufacturer", language)}</div>
              <div><span className="font-semibold text-gray-600">{t("piezo.model", language)}:</span> {piezo!.model || "—"}</div>
              <div><span className="font-semibold text-gray-600">{t("piezo.tip", language)}:</span> {piezo!.tip || "—"}</div>
              <div><span className="font-semibold text-gray-600">{t("piezo.serial", language)}:</span> {piezo!.serial || "—"}</div>
              {piezo!.notes && <div className="col-span-2"><span className="font-semibold text-gray-600">{t("piezo.notes", language)}:</span> {piezo!.notes}</div>}
            </div>
          </PrintSection>
        )}

        {recommendationsBlock}
        {homeMedicationBlock}
        {nextAppointmentBlock}
        {summaryBlock}

        {sel.internalNotes && internalNotesText && (
          <PrintSection title={t("sec.internalNotes", language)}>
            <EditableText
              value={internalNotesText}
              className="text-sm leading-relaxed whitespace-pre-wrap font-serif"
              {...editProps("internalNotes")}
            />
          </PrintSection>
        )}

        {/* Footer DEMO banner */}
        {isDemo && (
          <div className="mt-8 p-3 border-2 border-red-300 bg-red-50 text-center">
            <div className="text-sm font-bold text-red-700 uppercase tracking-widest">
              ⚠ {t("demo.footer", language)} ⚠
            </div>
          </div>
        )}

        {/* Reopen audit trail — só nas observações internas dos documentos internos */}
        {!isNota && sel.internalNotes && (protocol.reopenHistory?.length ?? 0) > 0 && (
          <div className="mt-8 pt-3 border-t border-gray-300 text-[10px] text-gray-500">
            <span className="font-semibold uppercase tracking-widest">{t("internal.reopenHistory", language)} </span>
            {protocol.reopenHistory!.map((ev, i) => (
              <span key={i}>
                {i > 0 && "; "}
                {new Date(ev.reopenedAt).toLocaleString(language === "en" ? "en-GB" : language === "es" ? "es-ES" : "pt-PT")}
                {ev.reopenedBy ? ` (${ev.reopenedBy})` : ""}
              </span>
            ))}
          </div>
        )}

        {/* Assinatura — o anestesista nunca surge aqui */}
        <SurgeonSignature
          representative={protocol.signatureRepresentative}
          signatureUrl={signatureUrl}
          lang={language}
        />

        <ClinicFooter legal={isNota} lang={language} />

      </div>
      )}

      {/* Print styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { margin: 15mm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
          #print-document { max-width: 100%; width: 100%; }
        }
      `}} />
    </div>
  );
}
