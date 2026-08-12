import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Check, X, Minus } from "lucide-react";
import { ChecklistItem, ChecklistItemStatus, PreopDiagnosis } from "@workspace/api-client-react";

interface PreopSectionProps {
  checklist: ChecklistItem[];
  updateChecklist: (checklist: ChecklistItem[]) => void;
  diagnosis: PreopDiagnosis;
  updateDiagnosis: (diagnosis: PreopDiagnosis) => void;
  isFinalized: boolean;
}

const DEFAULT_CHECKLIST = [
  "Consentimento Informado",
  "Avaliação Pré-Anestésica",
  "Modelos / Goteiras Cirúrgicas",
  "Planeamento Virtual (VSP)",
  "Material Osteossíntese Específico"
];

export function PreopSection({ checklist, updateChecklist, diagnosis, updateDiagnosis, isFinalized }: PreopSectionProps) {
  
  // Initialize default checklist if empty
  if (checklist.length === 0 && !isFinalized) {
    const defaultList = DEFAULT_CHECKLIST.map(item => ({ item, status: ChecklistItemStatus.missing }));
    updateChecklist(defaultList);
  }

  const handleChecklistStatus = (index: number, status: ChecklistItemStatus) => {
    if (isFinalized) return;
    const newList = [...checklist];
    newList[index].status = status;
    updateChecklist(newList);
  };

  const handleDiagChange = (field: keyof PreopDiagnosis, value: any) => {
    if (isFinalized) return;
    updateDiagnosis({ ...diagnosis, [field]: value });
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-xs border-border/50">
        <CardHeader>
          <CardTitle className="uppercase tracking-widest text-sm text-primary">Checklist Pré-Operatória</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {checklist.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-sm border bg-muted/5">
                <span className="font-medium text-sm">{item.item}</span>
                <div className="flex bg-muted p-1 rounded-sm">
                  <Button 
                    type="button"
                    variant={item.status === ChecklistItemStatus.ok ? "default" : "ghost"}
                    size="sm"
                    className={`px-3 py-1 h-8 rounded-sm text-xs uppercase tracking-wider ${item.status === ChecklistItemStatus.ok ? 'bg-teal-600 hover:bg-teal-700' : ''}`}
                    onClick={() => handleChecklistStatus(index, ChecklistItemStatus.ok)}
                    disabled={isFinalized}
                  >
                    <Check className="h-4 w-4 mr-1" /> OK
                  </Button>
                  <Button 
                    type="button"
                    variant={item.status === ChecklistItemStatus.missing ? "destructive" : "ghost"}
                    size="sm"
                    className="px-3 py-1 h-8 rounded-sm text-xs uppercase tracking-wider"
                    onClick={() => handleChecklistStatus(index, ChecklistItemStatus.missing)}
                    disabled={isFinalized}
                  >
                    <X className="h-4 w-4 mr-1" /> Falta
                  </Button>
                  <Button 
                    type="button"
                    variant={item.status === ChecklistItemStatus.na ? "secondary" : "ghost"}
                    size="sm"
                    className="px-3 py-1 h-8 rounded-sm text-xs uppercase tracking-wider"
                    onClick={() => handleChecklistStatus(index, ChecklistItemStatus.na)}
                    disabled={isFinalized}
                  >
                    <Minus className="h-4 w-4 mr-1" /> N/A
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-xs border-border/50">
        <CardHeader>
          <CardTitle className="uppercase tracking-widest text-sm text-primary">Diagnóstico & Padrão Facial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Classe Esquelética</Label>
              <Select 
                disabled={isFinalized} 
                value={diagnosis.skeletalClass || ""} 
                onValueChange={(val) => handleDiagChange("skeletalClass", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="I">Classe I</SelectItem>
                  <SelectItem value="II">Classe II</SelectItem>
                  <SelectItem value="III">Classe III</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Padrão Vertical</Label>
              <Select 
                disabled={isFinalized} 
                value={diagnosis.verticalPattern || ""} 
                onValueChange={(val) => handleDiagChange("verticalPattern", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normodivergent">Normodivergente</SelectItem>
                  <SelectItem value="hyperdivergent">Hiperdivergente (Face Longa)</SelectItem>
                  <SelectItem value="hypodivergent">Hipodivergente (Face Curta)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Overjet (mm)</Label>
              <Input 
                type="number" 
                step="0.5"
                value={diagnosis.overjet || ""} 
                onChange={(e) => handleDiagChange("overjet", parseFloat(e.target.value))} 
                disabled={isFinalized}
                className="font-mono text-right"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Overbite (mm)</Label>
              <Input 
                type="number" 
                step="0.5"
                value={diagnosis.overbite || ""} 
                onChange={(e) => handleDiagChange("overbite", parseFloat(e.target.value))} 
                disabled={isFinalized}
                className="font-mono text-right"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 border-t border-border/50">
            <div className="flex items-center justify-between space-x-2">
              <Label className="text-sm font-medium">Assimetria Facial</Label>
              <Switch 
                checked={diagnosis.facialAsymmetry || false} 
                onCheckedChange={(val) => handleDiagChange("facialAsymmetry", val)} 
                disabled={isFinalized} 
              />
            </div>
            <div className="flex items-center justify-between space-x-2">
              <Label className="text-sm font-medium">Mordida Aberta</Label>
              <Switch 
                checked={diagnosis.openBite || false} 
                onCheckedChange={(val) => handleDiagChange("openBite", val)} 
                disabled={isFinalized} 
              />
            </div>
            <div className="flex items-center justify-between space-x-2">
              <Label className="text-sm font-medium">Mordida Cruzada</Label>
              <Switch 
                checked={diagnosis.crossBite || false} 
                onCheckedChange={(val) => handleDiagChange("crossBite", val)} 
                disabled={isFinalized} 
              />
            </div>
            <div className="flex items-center justify-between space-x-2">
              <Label className="text-sm font-medium">Apneia / Via Aérea</Label>
              <Switch 
                checked={diagnosis.airwayCompromise || false} 
                onCheckedChange={(val) => handleDiagChange("airwayCompromise", val)} 
                disabled={isFinalized} 
              />
            </div>
          </div>

          {diagnosis.facialAsymmetry && (
            <div className="space-y-2 animate-in fade-in duration-300">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Detalhes da Assimetria</Label>
              <Input 
                value={diagnosis.asymmetryDetails || ""} 
                onChange={(e) => handleDiagChange("asymmetryDetails", e.target.value)} 
                disabled={isFinalized}
                placeholder="Ex: Desvio do mento 4mm para a direita, inclinação do plano oclusal..."
              />
            </div>
          )}

          <div className="space-y-2 pt-4 border-2 border-red-300 bg-red-50/60 rounded-sm p-4">
            <Label className="text-xs uppercase tracking-wider text-red-700 font-bold">⚠ Avisos Importantes (ex: risco cardíaco, alergias, anticoagulação...)</Label>
            <Textarea 
              value={(diagnosis as any).clinicalAlerts || ""} 
              onChange={(e) => handleDiagChange("clinicalAlerts" as any, e.target.value)} 
              disabled={isFinalized}
              className="resize-none bg-white border-red-200"
              rows={3}
              placeholder="Ex: Risco cardíaco — avaliação cardiológica obrigatória; alergia a penicilina..."
            />
            <p className="text-[11px] text-red-700/80">Estes avisos aparecem em destaque em todos os passos do protocolo e no relatório impresso.</p>
          </div>

          <div className="space-y-2 pt-4">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Notas Diagnósticas Adicionais</Label>
            <Textarea 
              value={diagnosis.additionalNotes || ""} 
              onChange={(e) => handleDiagChange("additionalNotes", e.target.value)} 
              disabled={isFinalized}
              className="resize-none"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
