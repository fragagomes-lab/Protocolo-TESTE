import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  LabPrediction,
  LabPredictionCheck,
  LabPredictionCheckSide,
  LabPredictionMallampati,
  LabPredictionSurgeryStart,
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

const COMPLEMENTS: Array<{ key: "septoplasty" | "segmented" | "mentoplasty" | "atmProsthesis"; label: string }> = [
  { key: "septoplasty", label: "Septoplastia" },
  { key: "segmented", label: "Segmentar" },
  { key: "mentoplasty", label: "Mentoplastia" },
  { key: "atmProsthesis", label: "Prótese ATM" },
];

export function LabPredictionSection({ value, onChange, isFinalized }: LabPredictionSectionProps) {
  const checks = value.checks ?? [];

  const set = (patch: Partial<LabPrediction>) => {
    if (isFinalized) return;
    onChange({ ...value, ...patch });
  };

  const setComplement = (key: string, val: boolean | string) => {
    set({ complements: { ...value.complements, [key]: val } });
  };

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
        <CardTitle className="uppercase tracking-widest text-sm text-primary">Previsão Laboratorial</CardTitle>
        <CardDescription>Projecto de Previsão Laboratorial — preparação do dia da cirurgia</CardDescription>
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

        {/* Complementos */}
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Complementos</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {COMPLEMENTS.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 p-3 rounded-sm border bg-muted/5 cursor-pointer">
                <Checkbox
                  checked={Boolean(value.complements?.[key])}
                  onCheckedChange={(v) => setComplement(key, v === true)}
                  disabled={isFinalized}
                />
                <span className="text-sm font-medium">{label}</span>
              </label>
            ))}
          </div>
          <Input
            value={value.complements?.other || ""}
            onChange={(e) => setComplement("other", e.target.value)}
            disabled={isFinalized}
            placeholder="Outros complementos..."
          />
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
