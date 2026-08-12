import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SurgicalPlan, OrthoMovements, AssociatedProcedure } from "@workspace/api-client-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface PlanSectionProps {
  plan: SurgicalPlan;
  updatePlan: (plan: SurgicalPlan) => void;
  isFinalized: boolean;
}

export function PlanSection({ plan, updatePlan, isFinalized }: PlanSectionProps) {
  
  // Safe updaters
  const toggleMaxilla = (included: boolean) => {
    if (isFinalized) return;
    updatePlan({ ...plan, maxilla: { ...plan.maxilla, included } });
  };
  
  const toggleMandible = (included: boolean) => {
    if (isFinalized) return;
    updatePlan({ ...plan, mandible: { ...plan.mandible, included } });
  };
  
  const toggleChin = (included: boolean) => {
    if (isFinalized) return;
    updatePlan({ ...plan, chin: { ...plan.chin, included } });
  };

  const updateMaxillaMovements = (field: keyof OrthoMovements, value: number | undefined) => {
    if (isFinalized) return;
    const max = plan.maxilla || { included: true };
    const segs = max.segments || [{ segment: 'total', movements: {} }];
    if (segs.length > 0) {
      segs[0] = { ...segs[0], movements: { ...segs[0].movements, [field]: value } };
      updatePlan({ ...plan, maxilla: { ...max, segments: segs } });
    }
  };

  const updateMandibleMovements = (field: keyof OrthoMovements, value: number | undefined) => {
    if (isFinalized) return;
    const mand = plan.mandible || { included: true };
    updatePlan({ ...plan, mandible: { ...mand, movements: { ...mand.movements, [field]: value } } });
  };

  const updateChinMovements = (field: keyof OrthoMovements, value: number | undefined) => {
    if (isFinalized) return;
    const chin = plan.chin || { included: true };
    updatePlan({ ...plan, chin: { ...chin, movements: { ...chin.movements, [field]: value } } });
  };

  // Procedimentos associados (Septoplastia, Prótese ATM, etc.)
  const addAssociated = (name: string) => {
    if (isFinalized) return;
    updatePlan({ ...plan, associated: [...(plan.associated || []), { name, details: "", side: "" }] });
  };

  const updateAssociated = (idx: number, patch: Partial<AssociatedProcedure>) => {
    if (isFinalized) return;
    const list = [...(plan.associated || [])];
    list[idx] = { ...list[idx], ...patch };
    updatePlan({ ...plan, associated: list });
  };

  const removeAssociated = (idx: number) => {
    if (isFinalized) return;
    updatePlan({ ...plan, associated: (plan.associated || []).filter((_, i) => i !== idx) });
  };

  // Editor de segmentos da maxila segmentada (sem tocar no segmento "total")
  const SEGMENT_LABELS: Record<string, string> = {
    anterior: "Segmento Anterior",
    posterior_left: "Segmento Posterior Esq.",
    posterior_right: "Segmento Posterior Dir.",
  };

  const updateSegmentMovements = (segName: string, field: keyof OrthoMovements, value: number | undefined) => {
    if (isFinalized) return;
    const max = plan.maxilla || { included: true };
    const segs = [...(max.segments || [{ segment: 'total' as any, movements: {} }])].map(s => ({ ...s, movements: { ...s.movements } }));
    let seg = segs.find(s => s.segment === segName);
    if (!seg) { seg = { segment: segName as any, movements: {} }; segs.push(seg); }
    seg.movements = { ...seg.movements, [field]: value };
    updatePlan({ ...plan, maxilla: { ...max, segments: segs } });
  };

  // Helper for Movement Inputs to keep the visual "clinical"
  // Precisão: passo 0,01 (≥2 casas decimais); rotações em graus (°)
  const MoveInput = ({ label, value, onChange, hint, unit = "mm" }: { label: string, value: number | null | undefined, onChange: (v: number | undefined) => void, hint?: string, unit?: string }) => (
    <div className="flex flex-col space-y-2">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground text-center">{label}</Label>
      <div className="relative">
        <Input 
          type="number" 
          step="0.01"
          value={value === null || value === undefined ? "" : value}
          onChange={(e) => {
            const v = e.target.value === "" ? undefined : parseFloat(e.target.value);
            onChange(v !== undefined && isNaN(v) ? undefined : v);
          }}
          disabled={isFinalized}
          className="font-mono text-center text-lg h-12 bg-white"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">{unit}</span>
      </div>
      {hint && <span className="text-[10px] text-muted-foreground text-center leading-tight">{hint}</span>}
    </div>
  );

  return (
    <div className="space-y-8">
      
      {/* MAXILLA */}
      <Card className={`shadow-xs border-border/50 transition-all ${plan.maxilla?.included ? 'border-primary ring-1 ring-primary/20' : 'opacity-60 grayscale-[50%]'}`}>
        <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between py-4">
          <div>
            <CardTitle className="uppercase tracking-widest text-base text-foreground">Maxila</CardTitle>
            <CardDescription>Osteotomia LeFort I</CardDescription>
          </div>
          <Switch checked={plan.maxilla?.included || false} onCheckedChange={toggleMaxilla} disabled={isFinalized} />
        </CardHeader>
        {plan.maxilla?.included && (
          <CardContent className="pt-6 space-y-6">
            {/* Convenção do cirurgião: Dir. = ENP/PNS, Esq. = ponto A (degrau das placas paranasais) */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Lado Direito — ENP (degrau da placa paranasal dta.)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <MoveInput 
                    label="Avanço/Recuo (Sagital)" 
                    value={plan.maxilla.segments?.[0]?.movements?.sagittalRight ?? plan.maxilla.segments?.[0]?.movements?.sagittal} 
                    onChange={(v) => updateMaxillaMovements('sagittalRight', v)} 
                  />
                  <MoveInput 
                    label="Impacção/Descida (Vertical)" 
                    value={plan.maxilla.segments?.[0]?.movements?.verticalRight ?? plan.maxilla.segments?.[0]?.movements?.vertical} 
                    onChange={(v) => updateMaxillaMovements('verticalRight', v)} 
                  />
                  <MoveInput 
                    label="Transverso Dir." 
                    value={plan.maxilla.segments?.[0]?.movements?.transverseRight} 
                    onChange={(v) => updateMaxillaMovements('transverseRight', v)} 
                    hint="− dta / + esq do doente"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Lado Esquerdo — ponto A (degrau da placa paranasal esq.)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <MoveInput 
                    label="Avanço/Recuo (Sagital)" 
                    value={plan.maxilla.segments?.[0]?.movements?.sagittalLeft ?? plan.maxilla.segments?.[0]?.movements?.sagittal} 
                    onChange={(v) => updateMaxillaMovements('sagittalLeft', v)} 
                  />
                  <MoveInput 
                    label="Impacção/Descida (Vertical)" 
                    value={plan.maxilla.segments?.[0]?.movements?.verticalLeft ?? plan.maxilla.segments?.[0]?.movements?.vertical} 
                    onChange={(v) => updateMaxillaMovements('verticalLeft', v)} 
                  />
                  <MoveInput 
                    label="Transverso Esq." 
                    value={plan.maxilla.segments?.[0]?.movements?.transverseLeft} 
                    onChange={(v) => updateMaxillaMovements('transverseLeft', v)} 
                    hint="− dta / + esq do doente"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MoveInput 
                  label="Rotação (Yaw)" 
                  value={plan.maxilla.segments?.[0]?.movements?.rotation} 
                  onChange={(v) => updateMaxillaMovements('rotation', v)} 
                  unit="°"
                />
              </div>
            </div>

            {plan.maxilla.osteotomyType === 'segmented' && (
              <div className="space-y-6 border-2 border-primary/20 rounded-sm p-4 bg-primary/[0.02]">
                <div className="text-xs uppercase tracking-widest font-bold text-primary">Maxila Segmentada — movimentos por segmento</div>
                {(['anterior', 'posterior_right', 'posterior_left'] as const).map((segName) => {
                  const seg = plan.maxilla?.segments?.find((s) => s.segment === segName);
                  return (
                    <div key={segName} className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{SEGMENT_LABELS[segName]}</Label>
                      <div className="grid grid-cols-5 gap-4">
                        <MoveInput label="Sagital" value={seg?.movements?.sagittal} onChange={(v) => updateSegmentMovements(segName, 'sagittal', v)} />
                        <MoveInput label="Vertical" value={seg?.movements?.vertical} onChange={(v) => updateSegmentMovements(segName, 'vertical', v)} />
                        <MoveInput label="Transverso Dir." value={seg?.movements?.transverseRight} onChange={(v) => updateSegmentMovements(segName, 'transverseRight', v)} hint="− dta / + esq do doente" />
                        <MoveInput label="Transverso Esq." value={seg?.movements?.transverseLeft} onChange={(v) => updateSegmentMovements(segName, 'transverseLeft', v)} hint="− dta / + esq do doente" />
                        <MoveInput label="Rotação (Yaw)" value={seg?.movements?.rotation} onChange={(v) => updateSegmentMovements(segName, 'rotation', v)} unit="°" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Separator />
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Tipo de Osteotomia</Label>
                <Select disabled={isFinalized} value={plan.maxilla.osteotomyType || "LeFort_I"} onValueChange={(val: string) => updatePlan({...plan, maxilla: {...plan.maxilla, osteotomyType: val as any}})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LeFort_I">LeFort I Standard</SelectItem>
                    <SelectItem value="segmented">LeFort I Segmentada</SelectItem>
                    <SelectItem value="LeFort_II">LeFort II</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Enxerto Ósseo</Label>
                <Select disabled={isFinalized} value={plan.maxilla.bonGraft ? "yes" : "no"} onValueChange={(val) => updatePlan({...plan, maxilla: {...plan.maxilla, bonGraft: val === "yes"}})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">Não</SelectItem>
                    <SelectItem value="yes">Sim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {plan.maxilla.bonGraft && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Origem do Enxerto</Label>
                  <Input 
                    value={plan.maxilla.graftSource || ""} 
                    onChange={(e) => updatePlan({...plan, maxilla: {...plan.maxilla, graftSource: e.target.value}})}
                    disabled={isFinalized}
                    placeholder="Ex: Aloplástico, Ilíaco..."
                  />
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* MANDIBLE */}
      <Card className={`shadow-xs border-border/50 transition-all ${plan.mandible?.included ? 'border-primary ring-1 ring-primary/20' : 'opacity-60 grayscale-[50%]'}`}>
        <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between py-4">
          <div>
            <CardTitle className="uppercase tracking-widest text-base text-foreground">Mandíbula</CardTitle>
            <CardDescription>Osteotomia Sagital Bilateral (BSSO)</CardDescription>
          </div>
          <Switch checked={plan.mandible?.included || false} onCheckedChange={toggleMandible} disabled={isFinalized} />
        </CardHeader>
        {plan.mandible?.included && (
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-5 gap-4">
              <MoveInput 
                label="Avanço/Recuo (Sagital)" 
                value={plan.mandible.movements?.sagittal} 
                onChange={(v) => updateMandibleMovements('sagittal', v)} 
              />
              <MoveInput 
                label="Impacção/Descida (Vertical)" 
                value={plan.mandible.movements?.vertical} 
                onChange={(v) => updateMandibleMovements('vertical', v)} 
              />
              <MoveInput 
                label="Transverso Dir." 
                value={plan.mandible.movements?.transverseRight} 
                onChange={(v) => updateMandibleMovements('transverseRight', v)} 
                hint="− dta / + esq do doente"
              />
              <MoveInput 
                label="Transverso Esq." 
                value={plan.mandible.movements?.transverseLeft} 
                onChange={(v) => updateMandibleMovements('transverseLeft', v)} 
                hint="− dta / + esq do doente"
              />
              <MoveInput 
                label="Rotação (Yaw)" 
                value={plan.mandible.movements?.rotation} 
                onChange={(v) => updateMandibleMovements('rotation', v)} 
                unit="°"
              />
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Tipo de Osteotomia</Label>
                <Select disabled={isFinalized} value={plan.mandible.osteotomyType || "BSSO"} onValueChange={(val: string) => updatePlan({...plan, mandible: {...plan.mandible, osteotomyType: val as any}})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BSSO">BSSO (Sagital Bilateral)</SelectItem>
                    <SelectItem value="vertical_ramus">Ramo Vertical</SelectItem>
                    <SelectItem value="distraction">Distração Osteogênica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Posicionamento Condilar</Label>
                <Select disabled={isFinalized} value={plan.mandible.condylarPositioning || "manual"} onValueChange={(val) => updatePlan({...plan, mandible: {...plan.mandible, condylarPositioning: val}})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual / Passivo</SelectItem>
                    <SelectItem value="navigation">Navegação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* CHIN */}
      <Card className={`shadow-xs border-border/50 transition-all ${plan.chin?.included ? 'border-primary ring-1 ring-primary/20' : 'opacity-60 grayscale-[50%]'}`}>
        <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between py-4">
          <div>
            <CardTitle className="uppercase tracking-widest text-base text-foreground">Mento</CardTitle>
            <CardDescription>Mentoplastia</CardDescription>
          </div>
          <Switch checked={plan.chin?.included || false} onCheckedChange={toggleChin} disabled={isFinalized} />
        </CardHeader>
        {plan.chin?.included && (
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MoveInput 
                label="Avanço/Recuo (Sagital)" 
                value={plan.chin.movements?.sagittal} 
                onChange={(v) => updateChinMovements('sagittal', v)} 
              />
              <MoveInput 
                label="Impacção/Aumento (Vertical)" 
                value={plan.chin.movements?.vertical} 
                onChange={(v) => updateChinMovements('vertical', v)} 
              />
              <MoveInput 
                label="Transverso/Assimetria" 
                value={plan.chin.movements?.transverseRight} 
                onChange={(v) => updateChinMovements('transverseRight', v)} 
                hint="− dta / + esq do doente"
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* PROCEDIMENTOS ASSOCIADOS */}
      <Card className="shadow-xs border-border/50">
        <CardHeader className="py-4">
          <CardTitle className="uppercase tracking-widest text-base text-foreground">Procedimentos Associados</CardTitle>
          <CardDescription>Septoplastia, turbinectomia, extrações, Prótese ATM...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {["Septoplastia", "Turbinectomia", "Extração de dentes inclusos", "Enxerto ósseo", "Prótese ATM"].map((name) => (
              <Button
                key={name}
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={isFinalized || (plan.associated || []).some((p) => p.name === name)}
                onClick={() => addAssociated(name)}
              >
                + {name}
              </Button>
            ))}
          </div>
          {(plan.associated || []).length > 0 && (
            <div className="space-y-2">
              {(plan.associated || []).map((proc, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={proc.name}
                    onChange={(e) => updateAssociated(idx, { name: e.target.value })}
                    disabled={isFinalized}
                    placeholder="Procedimento"
                    className="flex-1"
                  />
                  <Input
                    value={proc.details || ""}
                    onChange={(e) => updateAssociated(idx, { details: e.target.value })}
                    disabled={isFinalized}
                    placeholder="Detalhes"
                    className="flex-1"
                  />
                  <Select
                    value={proc.side || "none"}
                    onValueChange={(v) => updateAssociated(idx, { side: (v === "none" ? "" : v) as any })}
                    disabled={isFinalized}
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Lado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      <SelectItem value="bilateral">Bilateral</SelectItem>
                      <SelectItem value="left">Esquerdo</SelectItem>
                      <SelectItem value="right">Direito</SelectItem>
                      <SelectItem value="central">Central</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isFinalized}
                    onClick={() => removeAssociated(idx)}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    aria-label="Remover procedimento"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* PARTE NASAL */}
      <Card className="shadow-xs border-amber-300 border-2 bg-amber-50/40">
        <CardHeader className="py-4">
          <CardTitle className="uppercase tracking-widest text-base text-amber-800">⚠ Parte Nasal — Não Esquecer</CardTitle>
          <CardDescription>Septo, espinha nasal, cinch, base alar, turbinectomia...</CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            value={(plan as any).nasalNotes || ""}
            onChange={(e) => { if (!isFinalized) updatePlan({ ...plan, nasalNotes: e.target.value } as SurgicalPlan); }}
            disabled={isFinalized}
            rows={3}
            placeholder="Ex: Septoplastia associada; sutura de cinch alar; recontorno da espinha nasal anterior..."
            className="w-full text-sm rounded-sm border border-amber-200 bg-white p-3 resize-none focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </CardContent>
      </Card>

    </div>
  );
}
