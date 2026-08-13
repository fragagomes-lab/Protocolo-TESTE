import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import {
  LabPrediction,
  LabPredictionCheck,
  LabPredictionCheckSide,
  LabPredictionMallampati,
  LabPredictionSurgeryStart,
  LabPredictionMaxillaComplement,
  LabPredictionMaxillaComplementSegmentationParts,
  LabPredictionMaxillaComplementSegmentationType,
  LabPredictionMandibleComplement,
  LabPredictionMandibleComplementRidgePlastySide,
  LabPredictionChinComplement,
  LabPredictionNasalComplement,
  LabPredictionNasalComplementSeptumDeviationSide,
  LabPredictionNasalComplementVomerianSpurSide,
  AlloplasticImplant,
  AlloplasticImplantRegion,
  AlloplasticImplantSide,
  AlloplasticImplantMaterial,
} from "@workspace/api-client-react";

interface LabPredictionSectionProps {
  value: LabPrediction;
  onChange: (value: LabPrediction) => void;
  isFinalized: boolean;
}

// Verificações numeradas do "Projecto de Previsão Laboratorial".
// A numeração original é mantida (as verificações 5, 10, 11, 12 e 13 foram
// removidas intencionalmente por ordem do cirurgião — não reintroduzir).
export const LAB_CHECKS: Array<{
  id: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  hasSide?: boolean;
  hasDirection?: boolean; // subir/descer
  hasValueMm?: boolean;
  fixedNote?: string;
}> = [
  {
    id: "1",
    label: "1 — Desvio da pirâmide nasal?",
    options: [
      { value: "nao", label: "Não" },
      { value: "sim_corrigir", label: "Sim — corrigir" },
    ],
    hasSide: true,
  },
  {
    id: "2",
    label: "2 — Nivelamento transversal do plano oclusal superior",
    options: [
      { value: "ok", label: "OK" },
      { value: "mais_alto", label: "Mais alto" },
    ],
    hasSide: true,
  },
  {
    id: "3",
    label: "3 — Posição da linha média interdentária superior",
    options: [
      { value: "ok", label: "OK" },
      { value: "inclinada", label: "Inclinada" },
      { value: "desviada", label: "Desviada" },
    ],
    hasSide: true,
  },
  {
    id: "4",
    label: "4 — Exposição dos incisivos superiores — correção",
    options: [
      { value: "ok", label: "OK" },
      { value: "corrigir", label: "Sobe / desce no bordo incisal (após nivelamento)" },
    ],
    hasDirection: true,
    hasValueMm: true,
  },
  {
    id: "6",
    label: "6 — Correção da linha média interdentária superior",
    options: [
      { value: "ok", label: "OK" },
      { value: "corrigir", label: "Corrigir" },
    ],
    hasSide: true,
    hasValueMm: true,
    fixedNote: "Ponto de referência: ponto interradicular superior",
  },
  {
    id: "7",
    label: "7 — Posição da linha média interdentária inferior",
    options: [
      { value: "ok", label: "OK" },
      { value: "alinhada", label: "Alinhada com a superior" },
      { value: "desviada_lmf", label: "Desviada da LMF" },
    ],
    hasSide: true,
  },
  {
    id: "8",
    label: "8 — Material dentário — classe I canina bilateral",
    options: [
      { value: "ok", label: "OK" },
      { value: "segmentar_2", label: "Segmentar em 2 partes" },
      { value: "segmentar_3", label: "Segmentar em 3 partes" },
    ],
  },
  {
    id: "9",
    label: "9 — Discrepância transversal maxilo-mandibular",
    options: [
      { value: "ok", label: "OK" },
      { value: "corrigir_segmentacao", label: "Corrigir com segmentação" },
    ],
  },
];

export function checkOptionLabel(id: string, option?: string): string {
  const def = LAB_CHECKS.find((c) => c.id === id);
  return def?.options.find((o) => o.value === option)?.label ?? option ?? "";
}

export function LabPredictionSection({ value, onChange, isFinalized }: LabPredictionSectionProps) {
  const checks = value.checks ?? [];

  const set = (patch: Partial<LabPrediction>) => {
    if (isFinalized) return;
    onChange({ ...value, ...patch });
  };

  // ── Compatibilidade de leitura: se só existir o objeto antigo `complements`,
  // pré-preenche as novas secções convertendo o que der. Não persiste até edição.
  const legacy = value.complements ?? {};
  const maxilla: LabPredictionMaxillaComplement =
    value.maxillaComplement ?? (legacy.segmented ? { segmentationParts: "2" as LabPredictionMaxillaComplementSegmentationParts } : {});
  const mandible: LabPredictionMandibleComplement =
    value.mandibleComplement ?? (legacy.atmProsthesis ? { atmProsthesis: true } : {});
  const chin: LabPredictionChinComplement =
    value.chinComplement ?? (legacy.mentoplasty ? { mentoplasty: true } : {});
  const nasal: LabPredictionNasalComplement =
    value.nasalComplement ?? (legacy.septoplasty ? { septumDeviationSide: "" as LabPredictionNasalComplementSeptumDeviationSide } : {});
  const implants: AlloplasticImplant[] = value.alloplasticImplants ?? [];

  const setMaxilla = (patch: Partial<LabPredictionMaxillaComplement>) =>
    set({ maxillaComplement: { ...maxilla, ...patch } });
  const setMandible = (patch: Partial<LabPredictionMandibleComplement>) =>
    set({ mandibleComplement: { ...mandible, ...patch } });
  const setChin = (patch: Partial<LabPredictionChinComplement>) =>
    set({ chinComplement: { ...chin, ...patch } });
  const setNasal = (patch: Partial<LabPredictionNasalComplement>) =>
    set({ nasalComplement: { ...nasal, ...patch } });

  const addImplant = () =>
    set({ alloplasticImplants: [...implants, {}] });
  const updateImplant = (idx: number, patch: Partial<AlloplasticImplant>) =>
    set({ alloplasticImplants: implants.map((im, i) => (i === idx ? { ...im, ...patch } : im)) });
  const removeImplant = (idx: number) =>
    set({ alloplasticImplants: implants.filter((_, i) => i !== idx) });

  // Quando o "Início da Cirurgia" está escolhido, as secções Maxila e Mandíbula
  // ficam sempre visíveis para registo.
  const surgeryStartChosen = !!value.surgeryStart;

  const getCheck = (id: string): LabPredictionCheck => checks.find((c) => c.id === id) ?? { id };

  const setCheck = (id: string, patch: Partial<LabPredictionCheck>) => {
    if (isFinalized) return;
    const existing = checks.find((c) => c.id === id);
    const next = existing
      ? checks.map((c) => (c.id === id ? { ...c, ...patch } : c))
      : [...checks, { id, ...patch }];
    set({ checks: next });
  };

  return (
    <Card className="shadow-xs border-border/50">
      <CardHeader>
        <CardTitle className="uppercase tracking-widest text-sm text-primary">Protocolo/Execução Cirúrgica</CardTitle>
        <CardDescription>Preparação e execução do dia da cirurgia</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Mallampati · Início da Cirurgia */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Mallampati</Label>
            <Select
              disabled={isFinalized}
              value={value.mallampati || ""}
              onValueChange={(v) => set({ mallampati: v as LabPredictionMallampati })}
            >
              <SelectTrigger><SelectValue placeholder="Selecione I–IV..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="I">I</SelectItem>
                <SelectItem value="II">II</SelectItem>
                <SelectItem value="III">III</SelectItem>
                <SelectItem value="IV">IV</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Início da Cirurgia</Label>
            <Select
              disabled={isFinalized}
              value={value.surgeryStart || ""}
              onValueChange={(v) => set({ surgeryStart: v as LabPredictionSurgeryStart })}
            >
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mandibula">Mandíbula</SelectItem>
                <SelectItem value="maxila">Maxila</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Cuidados Especiais */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Cuidados Especiais</Label>
          <Textarea
            value={value.specialCare || ""}
            onChange={(e) => set({ specialCare: e.target.value })}
            disabled={isFinalized}
            rows={2}
            className="resize-none"
            placeholder="Ex: asma, anticoagulação, alergias..."
          />
        </div>

        <Separator />

        {/* Complementos estruturados */}
        <div className="space-y-6">
          <Label className="text-xs uppercase tracking-widest font-bold text-primary">Complementos</Label>

          {/* Maxila */}
          <div className={`p-4 rounded-sm border bg-muted/5 space-y-3 ${surgeryStartChosen ? "ring-1 ring-primary/40" : ""}`}>
            <div className="text-sm font-semibold">Maxila</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Segmentação — nº de partes</Label>
                <Select
                  disabled={isFinalized}
                  value={maxilla.segmentationParts || ""}
                  onValueChange={(v) => setMaxilla({ segmentationParts: v as LabPredictionMaxillaComplementSegmentationParts })}
                >
                  <SelectTrigger><SelectValue placeholder="Sem segmentação" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 partes</SelectItem>
                    <SelectItem value="3">3 partes</SelectItem>
                    <SelectItem value="4">4 partes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Tipo</Label>
                <Select
                  disabled={isFinalized}
                  value={maxilla.segmentationType || ""}
                  onValueChange={(v) => setMaxilla({ segmentationType: v as LabPredictionMaxillaComplementSegmentationType })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expansao">Com expansão</SelectItem>
                    <SelectItem value="contracao">Com contração</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Notas</Label>
              <Textarea
                value={maxilla.notes || ""}
                onChange={(e) => setMaxilla({ notes: e.target.value })}
                disabled={isFinalized}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          {/* Mandíbula */}
          <div className={`p-4 rounded-sm border bg-muted/5 space-y-3 ${surgeryStartChosen ? "ring-1 ring-primary/40" : ""}`}>
            <div className="text-sm font-semibold">Mandíbula</div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={Boolean(mandible.atmProsthesis)}
                onCheckedChange={(v) => setMandible({ atmProsthesis: v === true })}
                disabled={isFinalized}
              />
              <span className="text-sm font-medium">Prótese ATM</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Plastia do rebordo — lado</Label>
                <Select
                  disabled={isFinalized}
                  value={mandible.ridgePlastySide || ""}
                  onValueChange={(v) => setMandible({ ridgePlastySide: v as LabPredictionMandibleComplementRidgePlastySide })}
                >
                  <SelectTrigger><SelectValue placeholder="Sem plastia" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="D">Direito</SelectItem>
                    <SelectItem value="E">Esquerdo</SelectItem>
                    <SelectItem value="bilateral">Bilateral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Descrição da plastia</Label>
                <Input
                  value={mandible.ridgePlastyDescription || ""}
                  onChange={(e) => setMandible({ ridgePlastyDescription: e.target.value })}
                  disabled={isFinalized}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Notas</Label>
              <Textarea
                value={mandible.notes || ""}
                onChange={(e) => setMandible({ notes: e.target.value })}
                disabled={isFinalized}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          {/* Mento */}
          <div className="p-4 rounded-sm border bg-muted/5 space-y-3">
            <div className="text-sm font-semibold">Mento</div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={Boolean(chin.mentoplasty)}
                onCheckedChange={(v) => setChin({ mentoplasty: v === true })}
                disabled={isFinalized}
              />
              <span className="text-sm font-medium">Mentoplastia</span>
            </label>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Notas</Label>
              <Textarea
                value={chin.notes || ""}
                onChange={(e) => setChin({ notes: e.target.value })}
                disabled={isFinalized}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          {/* Nasal / Septoplastia */}
          <div className="p-4 rounded-sm border bg-muted/5 space-y-3">
            <div className="text-sm font-semibold">Nasal / Septoplastia</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Desvio do septo — lado</Label>
                <Select
                  disabled={isFinalized}
                  value={nasal.septumDeviationSide || ""}
                  onValueChange={(v) => setNasal({ septumDeviationSide: v as LabPredictionNasalComplementSeptumDeviationSide })}
                >
                  <SelectTrigger><SelectValue placeholder="Sem desvio" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="D">Direito</SelectItem>
                    <SelectItem value="E">Esquerdo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Esporão vomeriano — lado</Label>
                <Select
                  disabled={isFinalized}
                  value={nasal.vomerianSpurSide || ""}
                  onValueChange={(v) => setNasal({ vomerianSpurSide: v as LabPredictionNasalComplementVomerianSpurSide })}
                >
                  <SelectTrigger><SelectValue placeholder="Sem esporão" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="D">Direito</SelectItem>
                    <SelectItem value="E">Esquerdo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={Boolean(nasal.turbinates)}
                onCheckedChange={(v) => setNasal({ turbinates: v === true })}
                disabled={isFinalized}
              />
              <span className="text-sm font-medium">Cornetos</span>
            </label>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Notas</Label>
              <Textarea
                value={nasal.notes || ""}
                onChange={(e) => setNasal({ notes: e.target.value })}
                disabled={isFinalized}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          {/* Implantes aloplásticos de contorno */}
          <div className="p-4 rounded-sm border bg-muted/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Implantes aloplásticos de contorno</div>
              {!isFinalized && (
                <Button type="button" size="sm" variant="outline" onClick={addImplant} className="h-7 text-[10px] uppercase tracking-wider">
                  <Plus className="h-3 w-3 mr-1" /> Adicionar
                </Button>
              )}
            </div>
            {implants.length === 0 ? (
              <div className="text-xs text-muted-foreground italic">Sem implantes registados.</div>
            ) : (
              <div className="space-y-3">
                {implants.map((im, idx) => (
                  <div key={idx} className="p-3 rounded-sm border bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Implante {idx + 1}</span>
                      {!isFinalized && (
                        <button
                          type="button"
                          onClick={() => removeImplant(idx)}
                          className="p-1 text-muted-foreground hover:text-destructive"
                          title="Remover"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Região</Label>
                        <Select
                          disabled={isFinalized}
                          value={im.region || ""}
                          onValueChange={(v) => updateImplant(idx, { region: v as AlloplasticImplantRegion })}
                        >
                          <SelectTrigger><SelectValue placeholder="Região" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="malar">Malar</SelectItem>
                            <SelectItem value="mandibular">Mandibular</SelectItem>
                            <SelectItem value="mento">Mento</SelectItem>
                            <SelectItem value="outra">Outra</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Lado</Label>
                        <Select
                          disabled={isFinalized}
                          value={im.side || ""}
                          onValueChange={(v) => updateImplant(idx, { side: v as AlloplasticImplantSide })}
                        >
                          <SelectTrigger><SelectValue placeholder="Lado" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="D">Direito</SelectItem>
                            <SelectItem value="E">Esquerdo</SelectItem>
                            <SelectItem value="bilateral">Bilateral</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Material</Label>
                        <Select
                          disabled={isFinalized}
                          value={im.material || ""}
                          onValueChange={(v) => updateImplant(idx, { material: v as AlloplasticImplantMaterial })}
                        >
                          <SelectTrigger><SelectValue placeholder="Material" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="titanio">Titânio</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={Boolean(im.customMade)}
                          onCheckedChange={(v) => updateImplant(idx, { customMade: v === true })}
                          disabled={isFinalized}
                        />
                        <span className="text-sm font-medium">Personalizado</span>
                      </label>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Marca / Referência</Label>
                        <Input
                          value={im.brandReference || ""}
                          onChange={(e) => updateImplant(idx, { brandReference: e.target.value })}
                          disabled={isFinalized}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Lote</Label>
                        <Input
                          value={im.lot || ""}
                          onChange={(e) => updateImplant(idx, { lot: e.target.value })}
                          disabled={isFinalized}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Notas</Label>
                      <Input
                        value={im.notes || ""}
                        onChange={(e) => updateImplant(idx, { notes: e.target.value })}
                        disabled={isFinalized}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outros procedimentos */}
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Outros procedimentos</Label>
            <Textarea
              value={value.otherProcedures || ""}
              onChange={(e) => set({ otherProcedures: e.target.value })}
              disabled={isFinalized}
              rows={2}
              className="resize-none"
              placeholder="Descreva outros procedimentos complementares..."
            />
          </div>
        </div>

        <Separator />

        {/* Verificações numeradas */}
        <div className="space-y-4">
          <Label className="text-xs uppercase tracking-widest font-bold text-primary">Verificar</Label>
          {LAB_CHECKS.map((def) => {
            const check = getCheck(def.id);
            return (
              <div key={def.id} className="p-4 rounded-sm border bg-muted/5 space-y-3">
                <div className="text-sm font-semibold">{def.label}</div>
                {def.fixedNote && (
                  <div className="text-xs text-muted-foreground italic">{def.fixedNote}</div>
                )}
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-1 min-w-[220px]">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Opção</Label>
                    <Select
                      disabled={isFinalized}
                      value={check.option || ""}
                      onValueChange={(v) => setCheck(def.id, { option: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {def.options.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {def.hasSide && (
                    <div className="space-y-1 w-[110px]">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Lado</Label>
                      <Select
                        disabled={isFinalized}
                        value={check.side || ""}
                        onValueChange={(v) => setCheck(def.id, { side: v as LabPredictionCheckSide })}
                      >
                        <SelectTrigger><SelectValue placeholder="D/E" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="D">Direito</SelectItem>
                          <SelectItem value="E">Esquerdo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {def.hasDirection && (
                    <div className="space-y-1 w-[120px]">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Direção</Label>
                      <Select
                        disabled={isFinalized}
                        value={check.direction || ""}
                        onValueChange={(v) => setCheck(def.id, { direction: v })}
                      >
                        <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="subir">Subir</SelectItem>
                          <SelectItem value="descer">Descer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {def.hasValueMm && (
                    <div className="space-y-1 w-[110px]">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">mm</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={check.valueMm ?? ""}
                        onChange={(e) => {
                          const v = e.target.value === "" ? null : parseFloat(e.target.value);
                          setCheck(def.id, { valueMm: v !== null && isNaN(v) ? null : v });
                        }}
                        disabled={isFinalized}
                        className="font-mono text-right"
                      />
                    </div>
                  )}
                  <div className="space-y-1 flex-1 min-w-[180px]">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Nota</Label>
                    <Input
                      value={check.note || ""}
                      onChange={(e) => setCheck(def.id, { note: e.target.value })}
                      disabled={isFinalized}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
