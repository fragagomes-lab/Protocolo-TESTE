import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ChecklistItem, PreopDiagnosis } from "@workspace/api-client-react";

interface PreopSectionProps {
  // Mantidos por compatibilidade com o chamador — a checklist genérica foi
  // substituída pela Checklist de Preparação (separador próprio).
  checklist?: ChecklistItem[];
  updateChecklist?: (checklist: ChecklistItem[]) => void;
  diagnosis: PreopDiagnosis;
  updateDiagnosis: (diagnosis: PreopDiagnosis) => void;
  isFinalized: boolean;
}

export function PreopSection({ diagnosis, updateDiagnosis, isFinalized }: PreopSectionProps) {
  const handleDiagChange = (field: keyof PreopDiagnosis, value: any) => {
    if (isFinalized) return;
    updateDiagnosis({ ...diagnosis, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* A checklist genérica foi substituída pela Checklist de Preparação em
          blocos (separador "Preparação" do protocolo). Registos antigos são
          preservados no bloco "Histórico" desse separador. */}
      <div className="border border-border/50 bg-muted/20 rounded-sm p-4 text-sm text-muted-foreground">
        A checklist pré-operatória passou para o separador <span className="font-semibold text-foreground">Preparação</span> (botão no topo do protocolo), organizada por blocos: Ortodontista, Documentação, Fotos Clínicas, Imagiologia e Cirurgia Virtual 3D.
      </div>

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
