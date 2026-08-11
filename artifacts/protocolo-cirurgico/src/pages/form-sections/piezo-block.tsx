import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PiezoEquipment } from "@workspace/api-client-react";
import { Zap } from "lucide-react";

const BRAND_OPTIONS: { value: string; label: string }[] = [
  { value: "wh", label: "W&H (Piezomed)" },
  { value: "mectron", label: "Mectron (Piezosurgery)" },
  { value: "outro", label: "Outro fabricante" },
  { value: "nao_utilizado", label: "Não utilizado" },
];

interface PiezoBlockProps {
  piezo: PiezoEquipment;
  updatePiezo: (p: PiezoEquipment) => void;
  isFinalized: boolean;
}

export function PiezoBlock({ piezo, updatePiezo, isFinalized }: PiezoBlockProps) {
  const upd = (k: keyof PiezoEquipment, v: any) => {
    if (isFinalized) return;
    updatePiezo({ ...piezo, [k]: v });
  };

  const notUsed = piezo.brand === "nao_utilizado";

  return (
    <Card className="shadow-xs border-border/50">
      <CardHeader>
        <CardTitle className="uppercase tracking-widest text-sm text-primary flex items-center gap-2">
          <Zap className="h-4 w-4" /> Equipamento Piezoelétrico
        </CardTitle>
        <CardDescription>Registo do sistema de osteotomia ultrassónica utilizado</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2 max-w-md">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Fabricante / Sistema</Label>
          <Select disabled={isFinalized} value={piezo.brand || ""} onValueChange={v => upd("brand", v)}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Selecione o equipamento…" /></SelectTrigger>
            <SelectContent>
              {BRAND_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {!notUsed && piezo.brand && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Modelo</Label>
              <Input value={piezo.model || ""} onChange={e => upd("model", e.target.value)} disabled={isFinalized} placeholder="ex: Piezomed Module" className="h-9" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Ponta / Inserto</Label>
              <Input value={piezo.tip || ""} onChange={e => upd("tip", e.target.value)} disabled={isFinalized} placeholder="ex: B6, OT7…" className="h-9" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Nº de Série</Label>
              <Input value={piezo.serial || ""} onChange={e => upd("serial", e.target.value)} disabled={isFinalized} placeholder="Opcional" className="h-9 font-mono" />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Observações</Label>
              <Input value={piezo.notes || ""} onChange={e => upd("notes", e.target.value)} disabled={isFinalized} placeholder="Notas sobre a utilização" className="h-9" />
            </div>
          </div>
        )}

        {notUsed && (
          <p className="text-sm text-muted-foreground italic">Nenhum equipamento piezoelétrico utilizado neste procedimento.</p>
        )}
      </CardContent>
    </Card>
  );
}
