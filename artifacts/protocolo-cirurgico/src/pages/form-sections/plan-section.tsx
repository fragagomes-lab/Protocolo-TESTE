import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SurgicalPlan, OrthoMovements } from "@workspace/api-client-react";
import { Separator } from "@/components/ui/separator";

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

  const updateMaxillaMovements = (field: keyof OrthoMovements, value: number) => {
    if (isFinalized) return;
    const max = plan.maxilla || { included: true };
    const segs = max.segments || [{ segment: 'total', movements: {} }];
    if (segs.length > 0) {
      segs[0] = { ...segs[0], movements: { ...segs[0].movements, [field]: value } };
      updatePlan({ ...plan, maxilla: { ...max, segments: segs } });
    }
  };

  const updateMandibleMovements = (field: keyof OrthoMovements, value: number) => {
    if (isFinalized) return;
    const mand = plan.mandible || { included: true };
    updatePlan({ ...plan, mandible: { ...mand, movements: { ...mand.movements, [field]: value } } });
  };

  const updateChinMovements = (field: keyof OrthoMovements, value: number) => {
    if (isFinalized) return;
    const chin = plan.chin || { included: true };
    updatePlan({ ...plan, chin: { ...chin, movements: { ...chin.movements, [field]: value } } });
  };

  // Helper for Movement Inputs to keep the visual "clinical"
  const MoveInput = ({ label, value, onChange, hint }: { label: string, value: number | null | undefined, onChange: (v: number) => void, hint?: string }) => (
    <div className="flex flex-col space-y-2">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground text-center">{label}</Label>
      <div className="relative">
        <Input 
          type="number" 
          step="0.5"
          value={value === null || value === undefined ? "" : value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          disabled={isFinalized}
          className="font-mono text-center text-lg h-12 bg-white"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">mm</span>
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
            <div className="grid grid-cols-5 gap-4">
              <MoveInput 
                label="Avanço/Recuo (Sagital)" 
                value={plan.maxilla.segments?.[0]?.movements?.sagittal} 
                onChange={(v) => updateMaxillaMovements('sagittal', v)} 
              />
              <MoveInput 
                label="Impacção/Descida (Vertical)" 
                value={plan.maxilla.segments?.[0]?.movements?.vertical} 
                onChange={(v) => updateMaxillaMovements('vertical', v)} 
              />
              <MoveInput 
                label="Transverso Dir." 
                value={plan.maxilla.segments?.[0]?.movements?.transverseRight} 
                onChange={(v) => updateMaxillaMovements('transverseRight', v)} 
                hint="− dta / + esq do doente"
              />
              <MoveInput 
                label="Transverso Esq." 
                value={plan.maxilla.segments?.[0]?.movements?.transverseLeft} 
                onChange={(v) => updateMaxillaMovements('transverseLeft', v)} 
                hint="− dta / + esq do doente"
              />
              <MoveInput 
                label="Rotação (Yaw)" 
                value={plan.maxilla.segments?.[0]?.movements?.rotation} 
                onChange={(v) => updateMaxillaMovements('rotation', v)} 
              />
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Tipo de Osteotomia</Label>
                <Select disabled={isFinalized} value={plan.maxilla.osteotomyType || "LeFort_I"} onValueChange={(val: string) => updatePlan({...plan, maxilla: {...plan.maxilla, osteotomyType: val as any}})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LeFort_I">LeFort I Standard</SelectItem>
                    <SelectItem value="segmented">LeFort I Segmentada</SelectItem>
                    <SelectItem value="LeFort_II">LeFort II</SelectItem>
                    <SelectItem value="SARPE">SARPE</SelectItem>
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
            <div className="grid grid-cols-4 gap-4">
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
                label="Transverso/Lateralidade" 
                value={plan.mandible.movements?.transverseRight} 
                onChange={(v) => { updateMandibleMovements('transverseRight', v); updateMandibleMovements('transverseLeft', v); }} 
                hint="− dta / + esq do doente"
              />
              <MoveInput 
                label="Rotação (Yaw)" 
                value={plan.mandible.movements?.rotation} 
                onChange={(v) => updateMandibleMovements('rotation', v)} 
              />
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-6">
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
            <div className="grid grid-cols-3 gap-4">
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
