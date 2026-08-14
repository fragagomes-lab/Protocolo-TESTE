import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  ChevronRight, 
  ChevronLeft, 
  Save, 
  CheckCircle,
  FileText,
  Loader2,
  Printer,
  Unlock,
  ClipboardList
} from "lucide-react";

import { useGetProtocol, useCreateProtocol, useUpdateProtocol, getGetProtocolQueryKey, getListProtocolsQueryKey, useGenerateOperativeDescription, useListPhrases } from "@workspace/api-client-react";
import { ProtocolInput, ProtocolStatus, ProtocolUpdate } from "@workspace/api-client-react";
import { isFinalizedLockError, finalizedLockMessage } from "@/lib/finalized-error";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Sub-components to keep this file manageable
import { TeamSection } from "./form-sections/team-section";
import { PreopSection } from "./form-sections/preop-section";
import { PlanSection } from "./form-sections/plan-section";
import { IntraopSection } from "./form-sections/intraop-section";
import { DescriptionSection } from "./form-sections/description-section";
import { PlanningSection } from "./form-sections/planning-section";
import { AiProposalsReview } from "./form-sections/plan-ai-panel";
import { PlanReferenceImages } from "./form-sections/plan-reference-images";
import { ClinicalPhotosSection } from "./form-sections/clinical-photos-section";
import { Files3dSection } from "./form-sections/files-3d-section";
import { SurgicalDiagramsSection } from "./form-sections/surgical-diagrams-section";
import { LabPredictionSection } from "./form-sections/lab-prediction-section";
import { DiagnosisBuilder } from "./form-sections/diagnosis-builder";
import { statusLabel } from "@/lib/status-labels";

const STEPS = [
  { id: 1, title: "Identificação", label: "Dados Básicos" },
  { id: 2, title: "Fotografia Clínica", label: "Imagens" },
  { id: 3, title: "Checklist", label: "Pré-op" },
  { id: 4, title: "Cirurgia Virtual", label: "Imagens & IA" },
  { id: 5, title: "Plano Cirúrgico", label: "Movimentos" },
  { id: 6, title: "Registo Intra-op", label: "Tempos & Materiais" },
  { id: 7, title: "Descritivo", label: "Relatório Final" },
  { id: 8, title: "Diagramas Cirúrgicos", label: "Esquemas" },
  { id: 9, title: "Ficheiros 3D", label: "STL / PLY" },
];

// Etapas que exigem protocolo gravado (upload de ficheiros precisa de id)
const STEPS_REQUIRING_SAVE = [2, 4];

const LAST_STEP = STEPS.length;

export function ProtocolForm() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const protocolId = isNew ? null : Number(id);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState(() => {
    // Após gravação automática do rascunho, retomar a etapa pretendida (?step=N)
    const s = Number(new URLSearchParams(window.location.search).get("step"));
    return Number.isInteger(s) && s >= 1 && s <= 9 ? s : 1;
  });
  const [formData, setFormData] = useState<Partial<ProtocolInput>>({
    status: ProtocolStatus.draft,
    surgeryType: "Cirurgia Ortognática",
    team: { surgeon: "Dr. António Matos da Fonseca" },
  });
  
  const initializedForId = useRef<number | null>(null);

  // Referência sempre com o formData mais recente, para que qualquer gravação
  // (autosave ou manual) leia o snapshot no MOMENTO em que sai da fila — e não
  // uma closure antiga que sobreponha dados mais recentes.
  const formDataRef = useRef(formData);

  // Fila de gravações "latest-wins": todas as escritas (autosave e manual) são
  // encadeadas nesta promise para nunca correrem em paralelo nem chegarem fora
  // de ordem ao servidor.
  const saveChainRef = useRef<Promise<unknown>>(Promise.resolve());

  // Data Fetching
  const { data: protocol, isLoading } = useGetProtocol(protocolId as number, {
    query: { enabled: !isNew && !!protocolId, queryKey: ['getProtocol', protocolId] }
  });

  const createMutation = useCreateProtocol();
  const updateMutation = useUpdateProtocol();

  // Populate form when data loads
  useEffect(() => {
    if (protocol && protocol.id !== initializedForId.current) {
      initializedForId.current = protocol.id;
      setFormData({
        processNumber: protocol.processNumber,
        patientName: protocol.patientName,
        patientDOB: protocol.patientDOB || undefined,
        patientAge: protocol.patientAge || undefined,
        patientGender: protocol.patientGender || undefined,
        surgeryDate: protocol.surgeryDate || undefined,
        surgeryType: protocol.surgeryType,
        status: protocol.status,
        team: protocol.team || {},
        checklist: protocol.checklist || [],
        preopDiagnosis: protocol.preopDiagnosis || {},
        surgicalPlan: protocol.surgicalPlan || {},
        surgicalSequence: protocol.surgicalSequence || [],
        intraopRecord: protocol.intraopRecord || {},
        materials: protocol.materials || {},
        piezoEquipment: protocol.piezoEquipment || {},
        surgicalDiagrams: protocol.surgicalDiagrams || {},
        operativeDescription: protocol.operativeDescription || "",
        postopNotes: protocol.postopNotes || "",
        hospital: protocol.hospital || undefined,
        utenteNumber: protocol.utenteNumber || undefined,
        citizenCardNumber: protocol.citizenCardNumber || undefined,
        expectedStay: protocol.expectedStay || undefined,
        admissionDateTime: protocol.admissionDateTime || undefined,
        dischargeDateTime: protocol.dischargeDateTime || undefined,
        nextAppointmentDate: protocol.nextAppointmentDate || undefined,
        nextAppointmentTime: protocol.nextAppointmentTime || undefined,
        nextAppointmentLocation: protocol.nextAppointmentLocation || "Clínica da Face",
        homeMedication: protocol.homeMedication || "",
        postopRecommendations: protocol.postopRecommendations || "",
        labPrediction: protocol.labPrediction || {},
        insuranceEntity: protocol.insuranceEntity || undefined,
        beneficiaryNumber: protocol.beneficiaryNumber || undefined,
        orthoAppliance: protocol.orthoAppliance || undefined,
        // NB: "preparation" NÃO é carregado nem enviado pelo formulário — é
        // gerido exclusivamente pelo separador Preparação, para evitar que um
        // autosave com snapshot antigo apague alterações feitas lá.
      });
    }
  }, [protocol]);

  // Idade calculada automaticamente a partir da data de nascimento
  const computeAge = (dob?: string | null, refDate?: string | null): number | undefined => {
    if (!dob) return undefined;
    const birth = new Date(dob.split('T')[0]);
    if (isNaN(birth.getTime())) return undefined;
    const ref = refDate ? new Date(refDate.split('T')[0]) : new Date();
    let age = ref.getFullYear() - birth.getFullYear();
    const m = ref.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--;
    return age >= 0 && age < 130 ? age : undefined;
  };

  // Duração do internamento calculada (ex: "48 horas")
  const stayDurationLabel = (admission?: string | null, discharge?: string | null): string | null => {
    if (!admission || !discharge) return null;
    const a = new Date(admission);
    const d = new Date(discharge);
    if (isNaN(a.getTime()) || isNaN(d.getTime()) || d <= a) return null;
    const hours = Math.round((d.getTime() - a.getTime()) / 3600000);
    return `${hours} horas`;
  };

  // Mantém a referência do formData sincronizada a cada render, para as
  // gravações encadeadas lerem sempre o snapshot mais recente.
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Update Form Data Helper
  const updateForm = useCallback((key: keyof ProtocolInput, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  // Encadeia uma gravação (update) de um protocolo existente na fila serializada.
  // O `build` corre apenas quando a gravação sai da fila, lendo o formData mais
  // recente via ref — garantindo ordem correta e "latest-wins".
  const enqueueUpdate = (
    build: (formData: Partial<ProtocolInput>) => ProtocolUpdate | null,
  ): Promise<void> => {
    const run = saveChainRef.current
      .catch(() => {})
      .then(async () => {
        if (!protocolId) return;
        const data = build(formDataRef.current);
        if (!data) return;
        await updateMutation.mutateAsync({ id: protocolId, data });
      });
    saveChainRef.current = run;
    return run;
  };

  // Gravação silenciosa (autosave) ao mudar de passo num protocolo já existente.
  // Não mostra toast, não bloqueia a navegação e falha em silêncio (console.error).
  // Fica serializada na mesma fila da gravação manual (nunca corre em paralelo).
  const autosave = () => {
    if (isNew || !protocolId || isFinalized) return;
    enqueueUpdate((fd) => {
      if (!fd.processNumber || !fd.patientName) return null;
      return { ...fd, status: fd.status || ProtocolStatus.draft } as ProtocolUpdate;
    })
      .then(() => {
        if (protocolId) queryClient.invalidateQueries({ queryKey: getGetProtocolQueryKey(protocolId) });
      })
      .catch((e) => {
        // Falha silenciosa — não interrompe a navegação nem mostra toast.
        console.error("Autosave falhou", e);
      });
  };

  // Navegar entre etapas — grava automaticamente o rascunho quando a etapa
  // de destino exige protocolo existente (upload de imagens precisa de id).
  const goToStep = async (target: number) => {
    if (isNew && !protocolId && STEPS_REQUIRING_SAVE.includes(target)) {
      if (!formData.processNumber || !formData.patientName) {
        toast.error("Preencha o Nº de Processo e o Nome antes de adicionar imagens — o rascunho será guardado automaticamente.");
        setCurrentStep(1);
        return;
      }
      await handleSave(false, target);
      return;
    }
    // Autosave silencioso ao sair da etapa atual num protocolo existente.
    autosave();
    setCurrentStep(target);
  };

  // Save Function
  const handleSave = async (finalize = false, nextStep?: number) => {
    try {
      // Validação com o snapshot mais recente.
      const current = formDataRef.current;
      if (!current.processNumber || !current.patientName) {
        toast.error("Processo e Nome do Paciente são obrigatórios");
        setCurrentStep(1);
        return;
      }

      // Aparelho ortodôntico é obrigatório na criação (Etapa B); editável depois.
      if (isNew && !current.orthoAppliance) {
        toast.error("Selecione o Aparelho ortodôntico (BRK ou Aligners)");
        setCurrentStep(1);
        return;
      }

      if (isNew) {
        const dataToSave = {
          ...current,
          status: finalize ? ProtocolStatus.finalized : current.status || ProtocolStatus.draft,
        } as ProtocolInput;
        const result = await createMutation.mutateAsync({ data: dataToSave });
        toast.success(nextStep ? "Rascunho guardado automaticamente" : "Protocolo criado com sucesso");
        setLocation(`/protocols/${result.id}${nextStep ? `?step=${nextStep}` : ""}`);
      } else {
        // Gravação manual serializada na mesma fila do autosave — lê o formData
        // no momento em que sai da fila (latest-wins) e nunca corre em paralelo.
        const targetStatus = finalize ? ProtocolStatus.finalized : undefined;
        await enqueueUpdate((fd) => ({
          ...fd,
          status: targetStatus || fd.status || ProtocolStatus.draft,
        } as ProtocolUpdate));
        toast.success(finalize ? "Protocolo finalizado" : "Protocolo salvo com sucesso");
        queryClient.invalidateQueries({ queryKey: getGetProtocolQueryKey(protocolId!) });
        queryClient.invalidateQueries({ queryKey: getListProtocolsQueryKey() });
        setFormData(prev => ({ ...prev, status: targetStatus || prev.status || ProtocolStatus.draft }));
      }
    } catch (e) {
      if (isFinalizedLockError(e)) {
        // The report was finalized elsewhere (e.g. a stale tab). Surface the
        // friendly server message, sync the view to the locked read-only state,
        // and offer the un-finalize path instead of a dead-end error.
        toast.error(finalizedLockMessage(e), {
          description: "Este relatório já está finalizado. Reabra-o para poder editar.",
          action: protocolId
            ? { label: "Reabrir", onClick: () => handleUnfinalize() }
            : undefined,
        });
        if (protocolId) {
          queryClient.invalidateQueries({ queryKey: getGetProtocolQueryKey(protocolId) });
          queryClient.invalidateQueries({ queryKey: getListProtocolsQueryKey() });
        }
        setFormData(prev => ({ ...prev, status: ProtocolStatus.finalized }));
        return;
      }
      toast.error("Erro ao salvar o protocolo");
      console.error(e);
    }
  };

  // Un-finalize (reopen) a signed-off protocol so it can be edited again. This
  // is a status-only transition — the server only accepts a lone status change
  // away from "finalized", so no other field may be sent alongside it.
  const handleUnfinalize = async () => {
    if (!protocolId) return;
    // Audit trail: reopening a signed-off record is recorded with a timestamp
    // and the name of who reopened it. Cancelling the prompt aborts the reopen.
    const who = prompt(
      "Reabrir este protocolo finalizado para edição?\n\nIdentifique quem está a reabrir (nome):"
    );
    if (who === null) return;
    try {
      await updateMutation.mutateAsync({
        id: protocolId,
        data: {
          status: ProtocolStatus.intraop_complete,
          reopenedBy: who.trim() || null,
        } as ProtocolUpdate,
      });
      toast.success("Protocolo reaberto para edição");
      queryClient.invalidateQueries({ queryKey: getGetProtocolQueryKey(protocolId) });
      queryClient.invalidateQueries({ queryKey: getListProtocolsQueryKey() });
      setFormData(prev => ({ ...prev, status: ProtocolStatus.intraop_complete }));
    } catch (e) {
      toast.error("Erro ao reabrir o protocolo");
      console.error(e);
    }
  };

  if (isLoading && !isNew) {
    return (
      <div className="flex-1 p-4 md:p-8">
        <Skeleton className="h-12 w-full max-w-2xl mb-8" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const isFinalized = formData.status === ProtocolStatus.finalized;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="border-b px-8 py-5 flex items-center justify-between shrink-0 bg-white shadow-xs z-10 relative">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-light tracking-tight text-foreground">
                {isNew ? "Novo Protocolo" : `Protocolo #${formData.processNumber || id}`}
              </h1>
              {formData.processNumber?.startsWith("DEMO-") && (
                <Badge variant="destructive" className="uppercase text-[10px] tracking-wider">Demonstração</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-muted-foreground text-sm font-medium">{formData.patientName || "Paciente Não Identificado"}</p>
              {!isNew && (
                <Badge variant="outline" className={
                  formData.status === ProtocolStatus.draft ? "bg-muted" :
                  formData.status === ProtocolStatus.finalized ? "bg-primary text-white" :
                  "bg-blue-50 text-blue-700"
                }>
                  {statusLabel(formData.status)}
                </Badge>
              )}
            </div>
            {!isNew && (protocol?.reopenHistory?.length ?? 0) > 0 && (
              <p className="text-xs text-amber-700 mt-1">
                Reaberto {protocol!.reopenHistory!.length}× após finalização — última vez em{" "}
                {new Date(protocol!.reopenHistory![protocol!.reopenHistory!.length - 1].reopenedAt).toLocaleString("pt-PT")}
                {protocol!.reopenHistory![protocol!.reopenHistory!.length - 1].reopenedBy
                  ? ` por ${protocol!.reopenHistory![protocol!.reopenHistory!.length - 1].reopenedBy}`
                  : ""}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {!isNew && (
            <Button variant="outline" asChild className="uppercase tracking-widest text-xs">
              <Link href={`/protocols/${protocolId}/preparation`}>
                <ClipboardList className="mr-2 h-4 w-4" /> Preparação
              </Link>
            </Button>
          )}
          {!isNew && (
            <Button variant="outline" asChild className="uppercase tracking-widest text-xs">
              <Link href={`/protocols/${protocolId}/print`}>
                <Printer className="mr-2 h-4 w-4" /> Imprimir
              </Link>
            </Button>
          )}
          
          <Button 
            variant="outline" 
            onClick={() => handleSave(false)} 
            disabled={createMutation.isPending || updateMutation.isPending || isFinalized}
            className="uppercase tracking-widest text-xs"
          >
            {createMutation.isPending || updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar
          </Button>
          
          {!isFinalized ? (
            <Button 
              onClick={() => handleSave(true)} 
              disabled={createMutation.isPending || updateMutation.isPending}
              className="uppercase tracking-widest text-xs bg-sidebar hover:bg-sidebar-accent"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Finalizar
            </Button>
          ) : (
            !isNew && (
              <Button 
                variant="outline"
                onClick={handleUnfinalize} 
                disabled={updateMutation.isPending}
                className="uppercase tracking-widest text-xs"
              >
                {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unlock className="mr-2 h-4 w-4" />}
                Reabrir
              </Button>
            )
          )}
        </div>
      </div>

      {/* Step Indicator */}
      <div className="bg-muted/10 border-b px-8 py-4 shrink-0 flex justify-center">
        <div className="flex items-center w-full max-w-4xl">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <button 
                onClick={() => goToStep(step.id)}
                className={`flex flex-col items-center gap-1 group focus:outline-none ${currentStep === step.id ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors
                  ${currentStep === step.id ? 'border-primary bg-primary text-primary-foreground' : 
                    currentStep > step.id ? 'border-primary text-primary bg-primary/10' : 
                    'border-muted-foreground text-muted-foreground'}`
                }>
                  {currentStep > step.id ? <CheckCircle className="h-4 w-4" /> : step.id}
                </div>
                <div className="text-center">
                  <div className={`text-xs uppercase tracking-widest font-semibold mt-1 transition-colors ${currentStep === step.id ? 'text-primary' : 'text-muted-foreground'}`}>{step.title}</div>
                </div>
              </button>
              {index < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-4 transition-colors ${currentStep > step.id ? 'bg-primary' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content Area */}
      <div className="flex-1 overflow-auto bg-muted/5 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* AVISOS IMPORTANTES — sempre visível em todos os passos */}
          {(formData.preopDiagnosis as any)?.clinicalAlerts && (
            <div className="flex items-start gap-3 bg-red-50 border-2 border-red-400 rounded-sm p-4 text-red-900">
              <span className="text-xl leading-none" aria-hidden>⚠</span>
              <div>
                <div className="text-xs uppercase tracking-widest font-bold text-red-700 mb-1">Avisos Importantes</div>
                <div className="text-sm whitespace-pre-wrap font-medium">{(formData.preopDiagnosis as any).clinicalAlerts}</div>
              </div>
            </div>
          )}

          {/* STEP 1: Identification & Team */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Card className="shadow-xs border-border/50">
                <CardHeader>
                  <CardTitle className="uppercase tracking-widest text-sm text-primary">Identificação do Doente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="insuranceEntity" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Entidade (seguro, ADSE, …)</Label>
                      <Input
                        id="insuranceEntity"
                        value={formData.insuranceEntity || ""}
                        onChange={(e) => updateForm("insuranceEntity", e.target.value)}
                        disabled={isFinalized}
                        placeholder="Ex: ADSE, Médis, Multicare…"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="beneficiaryNumber" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Nº de Beneficiário / Apólice</Label>
                      <Input
                        id="beneficiaryNumber"
                        value={formData.beneficiaryNumber || ""}
                        onChange={(e) => updateForm("beneficiaryNumber", e.target.value)}
                        disabled={isFinalized}
                        className="font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="processNumber" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Nº Processo <span className="text-destructive">*</span></Label>
                      <Input 
                        id="processNumber" 
                        value={formData.processNumber || ""} 
                        onChange={(e) => updateForm("processNumber", e.target.value)} 
                        disabled={isFinalized}
                        className="font-mono text-lg tracking-wider"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="surgeryDate" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Data da Cirurgia</Label>
                      <Input 
                        id="surgeryDate" 
                        type="date"
                        value={formData.surgeryDate ? formData.surgeryDate.split('T')[0] : ""} 
                        onChange={(e) => {
                          const surgeryDate = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            surgeryDate,
                            patientAge: computeAge(prev.patientDOB, surgeryDate) ?? prev.patientAge,
                          }));
                        }} 
                        disabled={isFinalized}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="patientName" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Nome Completo <span className="text-destructive">*</span></Label>
                    <Input 
                      id="patientName" 
                      value={formData.patientName || ""} 
                      onChange={(e) => updateForm("patientName", e.target.value)} 
                      disabled={isFinalized}
                      className="text-lg"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="citizenCardNumber" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Nº Cartão de Cidadão</Label>
                      <Input
                        id="citizenCardNumber"
                        value={formData.citizenCardNumber || ""}
                        onChange={(e) => updateForm("citizenCardNumber", e.target.value)}
                        disabled={isFinalized}
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="utenteNumber" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Nº de Utente</Label>
                      <Input 
                        id="utenteNumber" 
                        value={formData.utenteNumber || ""} 
                        onChange={(e) => updateForm("utenteNumber", e.target.value)} 
                        disabled={isFinalized}
                        className="font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="patientDOB" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Data Nasc.</Label>
                      <Input 
                        id="patientDOB" 
                        type="date"
                        value={formData.patientDOB ? formData.patientDOB.split('T')[0] : ""} 
                        onChange={(e) => {
                          const dob = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            patientDOB: dob,
                            patientAge: computeAge(dob, prev.surgeryDate) ?? prev.patientAge,
                          }));
                        }} 
                        disabled={isFinalized}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="patientAge" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Idade (automática)</Label>
                      <Input 
                        id="patientAge" 
                        type="number"
                        value={computeAge(formData.patientDOB, formData.surgeryDate) ?? formData.patientAge ?? ""} 
                        readOnly
                        disabled
                        className="bg-muted/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Sexo</Label>
                      <Select 
                        disabled={isFinalized} 
                        value={formData.patientGender || ""} 
                        onValueChange={(val) => updateForm("patientGender", val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Masculino</SelectItem>
                          <SelectItem value="F">Feminino</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-border/50">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Aparelho Ortodôntico <span className="text-destructive">*</span></Label>
                    <Select
                      disabled={isFinalized}
                      value={(formData as any).orthoAppliance || ""}
                      onValueChange={(val) => updateForm("orthoAppliance" as any, val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione BRK ou Aligners..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="brk">BRK (aparelho fixo)</SelectItem>
                        <SelectItem value="aligners">Aligners (alinhadores)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">Obrigatório na criação; editável mais tarde no separador Preparação.</p>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-border/50">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Procedimento Principal</Label>
                    <Select 
                      disabled={isFinalized} 
                      value={formData.surgeryType || ""} 
                      onValueChange={(val) => updateForm("surgeryType", val)}
                    >
                      <SelectTrigger className="text-lg font-medium h-12">
                        <SelectValue placeholder="Selecione o procedimento..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cirurgia Ortognática Bimaxilar">Cirurgia Ortognática Bimaxilar</SelectItem>
                        <SelectItem value="Cirurgia Ortognática Monomaxilar">Cirurgia Ortognática Monomaxilar</SelectItem>
                        <SelectItem value="Mentoplastia Isolada">Mentoplastia Isolada</SelectItem>
                        {/* SARPE removido por ordem do cirurgião; mantido apenas se um protocolo legado já o tiver */}
                        {formData.surgeryType === "Expansão Cirurgicamente Assistida (SARPE)" && (
                          <SelectItem value="Expansão Cirurgicamente Assistida (SARPE)">Expansão Cirurgicamente Assistida (SARPE)</SelectItem>
                        )}
                        <SelectItem value="Aumento Aloplástico na Maxila ou Mandíbula">Aumento Aloplástico na Maxila ou Mandíbula</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-xs border-border/50">
                <CardHeader>
                  <CardTitle className="uppercase tracking-widest text-sm text-primary">Dados da Cirurgia &amp; Internamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="hospital" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Hospital</Label>
                      <Input 
                        id="hospital" 
                        value={formData.hospital || ""} 
                        onChange={(e) => updateForm("hospital", e.target.value)} 
                        disabled={isFinalized}
                        list="hospital-suggestions"
                        autoComplete="off"
                        placeholder="Escolha ou escreva o hospital..."
                      />
                      <datalist id="hospital-suggestions">
                        <option value="British Hospital LX" />
                        <option value="Hospital da Cruz Vermelha Portuguesa – Lisboa" />
                        <option value="Hospital de Santa Maria – Porto" />
                      </datalist>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expectedStay" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Internamento Previsto</Label>
                      <Input
                        id="expectedStay"
                        value={formData.expectedStay || ""}
                        onChange={(e) => updateForm("expectedStay", e.target.value)}
                        disabled={isFinalized}
                        placeholder="Ex: 24 horas"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="admissionDateTime" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Internamento (data e hora)</Label>
                      <Input 
                        id="admissionDateTime" 
                        type="datetime-local"
                        value={formData.admissionDateTime || ""} 
                        onChange={(e) => updateForm("admissionDateTime", e.target.value)} 
                        disabled={isFinalized}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dischargeDateTime" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Alta (data e hora)</Label>
                      <Input 
                        id="dischargeDateTime" 
                        type="datetime-local"
                        value={formData.dischargeDateTime || ""} 
                        onChange={(e) => updateForm("dischargeDateTime", e.target.value)} 
                        disabled={isFinalized}
                      />
                    </div>
                  </div>
                  {stayDurationLabel(formData.admissionDateTime, formData.dischargeDateTime) && (
                    <p className="text-sm text-muted-foreground">
                      Duração do internamento: <span className="font-semibold text-foreground">{stayDurationLabel(formData.admissionDateTime, formData.dischargeDateTime)}</span>
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-border/50">
                    <div className="space-y-2">
                      <Label htmlFor="nextAppointmentDate" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Próxima Consulta — Data</Label>
                      <Input 
                        id="nextAppointmentDate" 
                        type="date"
                        value={formData.nextAppointmentDate || ""} 
                        onChange={(e) => updateForm("nextAppointmentDate", e.target.value)} 
                        disabled={isFinalized}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nextAppointmentTime" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Hora</Label>
                      <Input 
                        id="nextAppointmentTime" 
                        type="time"
                        value={formData.nextAppointmentTime || ""} 
                        onChange={(e) => updateForm("nextAppointmentTime", e.target.value)} 
                        disabled={isFinalized}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nextAppointmentLocation" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Local</Label>
                      <Input 
                        id="nextAppointmentLocation" 
                        value={formData.nextAppointmentLocation ?? "Clínica da Face"} 
                        onChange={(e) => updateForm("nextAppointmentLocation", e.target.value)} 
                        disabled={isFinalized}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <TeamSection 
                team={formData.team || {}} 
                updateTeam={(team) => updateForm("team", team)} 
                isFinalized={isFinalized}
              />
            </div>
          )}

          {/* STEP 3: Pre-op Checklist (após as fotos iniciais) */}
          {currentStep === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <PreopSection 
                checklist={formData.checklist || []}
                updateChecklist={(cl) => updateForm("checklist", cl)}
                diagnosis={formData.preopDiagnosis || {}}
                updateDiagnosis={(diag) => updateForm("preopDiagnosis", diag)}
                isFinalized={isFinalized}
              />
              <div className="mt-6">
                <DiagnosisBuilder
                  protocolId={protocolId}
                  diagnosis={formData.preopDiagnosis || {}}
                  updateDiagnosis={(diag) => updateForm("preopDiagnosis", diag)}
                  patientAge={computeAge(formData.patientDOB, formData.surgeryDate) ?? formData.patientAge}
                  isFinalized={isFinalized}
                />
              </div>
              <div className="mt-6">
                <LabPredictionSection
                  value={formData.labPrediction || {}}
                  onChange={(lp) => updateForm("labPrediction", lp)}
                  isFinalized={isFinalized}
                />
              </div>
            </div>
          )}

          {/* STEP 5: Surgical Plan */}
          {currentStep === 5 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
              <PlanReferenceImages protocolId={protocolId} />
              <AiProposalsReview
                protocolId={protocolId}
                plan={formData.surgicalPlan || {}}
                updatePlan={(plan) => updateForm("surgicalPlan", plan)}
                isFinalized={isFinalized}
              />
              <PlanSection 
                plan={formData.surgicalPlan || {}}
                updatePlan={(plan) => updateForm("surgicalPlan", plan)}
                isFinalized={isFinalized}
              />
            </div>
          )}

          {/* STEP 6: Intraop Record */}
          {currentStep === 6 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <IntraopSection
                record={formData.intraopRecord || {}}
                updateRecord={(rec) => updateForm("intraopRecord", rec)}
                materials={formData.materials || {}}
                updateMaterials={(mat) => updateForm("materials", mat)}
                piezo={formData.piezoEquipment || {}}
                updatePiezo={(p) => updateForm("piezoEquipment", p)}
                isFinalized={isFinalized}
              />
            </div>
          )}

          {/* STEP 7: Description */}
          {currentStep === 7 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <DescriptionSection
                protocolId={protocolId}
                description={formData.operativeDescription || ""}
                updateDescription={(desc) => updateForm("operativeDescription", desc)}
                notes={formData.postopNotes || ""}
                updateNotes={(notes) => updateForm("postopNotes", notes)}
                homeMedication={formData.homeMedication || ""}
                updateHomeMedication={(v) => updateForm("homeMedication", v)}
                recommendations={formData.postopRecommendations || ""}
                updateRecommendations={(v) => updateForm("postopRecommendations", v)}
                isFinalized={isFinalized}
                formData={formData as ProtocolInput}
              />
            </div>
          )}

          {/* STEP 8: Surgical Diagrams */}
          {currentStep === 8 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Card className="shadow-xs border-border/50">
                <CardHeader>
                  <CardTitle className="uppercase tracking-widest text-sm text-primary">Diagramas Cirúrgicos — Osteotomias &amp; Placas</CardTitle>
                </CardHeader>
                <CardContent>
                  <SurgicalDiagramsSection
                    value={formData.surgicalDiagrams || {}}
                    onChange={(next) => updateForm("surgicalDiagrams", next)}
                    isFinalized={isFinalized}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* STEP 2: Clinical Photography (fotos iniciais) */}
          {currentStep === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Card className="shadow-xs border-border/50">
                <CardHeader>
                  <CardTitle className="uppercase tracking-widest text-sm text-primary">Fotografia Clínica</CardTitle>
                </CardHeader>
                <CardContent>
                  <ClinicalPhotosSection protocolId={protocolId} isFinalized={isFinalized} />
                </CardContent>
              </Card>
            </div>
          )}

          {/* STEP 9: 3D Files */}
          {currentStep === 9 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Card className="shadow-xs border-border/50">
                <CardHeader>
                  <CardTitle className="uppercase tracking-widest text-sm text-primary">Ficheiros 3D — Modelos & Guias</CardTitle>
                </CardHeader>
                <CardContent>
                  <Files3dSection protocolId={protocolId} isFinalized={isFinalized} />
                </CardContent>
              </Card>
            </div>
          )}

          {/* STEP 4: Planning Images + AI */}
          {currentStep === 4 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Card className="shadow-xs border-border/50">
                <CardHeader>
                  <CardTitle className="uppercase tracking-widest text-sm text-primary">Cirurgia Virtual — Imagens &amp; Análise IA</CardTitle>
                </CardHeader>
                <CardContent>
                  <PlanningSection protocolId={protocolId} isFinalized={isFinalized} />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex justify-between mt-8 pt-6 border-t border-border/50">
            <Button 
              variant="outline" 
              onClick={() => goToStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="uppercase tracking-widest"
            >
              <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
            </Button>
            
            {currentStep < LAST_STEP ? (
              <Button 
                onClick={() => goToStep(Math.min(LAST_STEP, currentStep + 1))}
                className="uppercase tracking-widest bg-primary hover:bg-primary/90"
              >
                Próximo <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button 
                onClick={() => handleSave(true)}
                disabled={createMutation.isPending || updateMutation.isPending || isFinalized}
                className="uppercase tracking-widest bg-sidebar hover:bg-sidebar-accent text-white"
              >
                {createMutation.isPending || updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Finalizar Protocolo
              </Button>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
