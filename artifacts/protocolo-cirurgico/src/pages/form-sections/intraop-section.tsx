import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  IntraopRecord,
  OsteosynthesisMaterials,
  PlateRecord,
  ScrewRecord,
  DrillRecord,
  SawRecord,
  PlateRecordPlateType,
  PlateRecordAnatomicalZone,
  PlateRecordSystem,
  PlateRecordSide,
  ScrewRecordScrewType,
  ScrewRecordDiameter,
  PiezoEquipment,
} from "@workspace/api-client-react";
import {
  Plus, Trash2, ChevronDown, ChevronUp,
  Wrench, Layers, X, AlignJustify
} from "lucide-react";

import { PlateSvgIcon } from "@/components/plate-svgs";
import { AnatomicalMap } from "@/components/anatomical-map";
import { PlateCatalogPicker } from "./plate-catalog-picker";
import { PiezoBlock } from "./piezo-block";

// ─── Plate catalogue ────────────────────────────────────────────────────────

const PLATE_CATALOGUE = [
  { key: "L_left_4h",  label: "L Esq. 4F",    sublabel: "Placa em L — 4 Furos (Esq.)", ref: "21-800-04-11", system: "2.0mm", defaultZone: "pilar_canino_esq",    defaultScrews: [{ screwType: "monocortical" as const, selfTapping: true, diameter: "2.0" as const, length: 5, quantity: 4 }] },
  { key: "L_right_4h", label: "L Dir. 4F",    sublabel: "Placa em L — 4 Furos (Dir.)", ref: "21-800-04-12", system: "2.0mm", defaultZone: "pilar_canino_dir",    defaultScrews: [{ screwType: "monocortical" as const, selfTapping: true, diameter: "2.0" as const, length: 5, quantity: 4 }] },
  { key: "L_left_6h",  label: "L Esq. 6F",    sublabel: "Placa em L — 6 Furos (Esq.)", ref: "21-800-06-11", system: "2.0mm", defaultZone: "pilar_zigomatico_esq", defaultScrews: [{ screwType: "monocortical" as const, selfTapping: true, diameter: "2.0" as const, length: 7, quantity: 4 }] },
  { key: "L_right_6h", label: "L Dir. 6F",    sublabel: "Placa em L — 6 Furos (Dir.)", ref: "21-800-06-12", system: "2.0mm", defaultZone: "pilar_zigomatico_dir", defaultScrews: [{ screwType: "monocortical" as const, selfTapping: true, diameter: "2.0" as const, length: 7, quantity: 4 }] },
  { key: "BSSO_right", label: "BSSO Dir.",     sublabel: "Placa BSSO — Ramo Direito",   ref: "21-850-BSSO-R", system: "2.0mm", defaultZone: "bordo_inf_dir",       defaultScrews: [{ screwType: "positional" as const, selfTapping: true, diameter: "2.0" as const, length: 14, quantity: 3 }] },
  { key: "BSSO_left",  label: "BSSO Esq.",     sublabel: "Placa BSSO — Ramo Esquerdo",  ref: "21-850-BSSO-L", system: "2.0mm", defaultZone: "bordo_inf_esq",       defaultScrews: [{ screwType: "positional" as const, selfTapping: true, diameter: "2.0" as const, length: 14, quantity: 3 }] },
  { key: "square",     label: "Quadrada",      sublabel: "Placa Quadrada / Cruciforme", ref: "21-860-SQ-00",  system: "2.0mm", defaultZone: "bordo_ant_dir",       defaultScrews: [{ screwType: "monocortical" as const, selfTapping: true, diameter: "2.0" as const, length: 5, quantity: 4 }] },
  { key: "chin",       label: "Mento",         sublabel: "Placa de Mento",              ref: "21-870-CHIN",   system: "2.0mm", defaultZone: "mento",               defaultScrews: [{ screwType: "monocortical" as const, selfTapping: true, diameter: "2.0" as const, length: 5, quantity: 6 }] },
  { key: "straight",   label: "Reta",          sublabel: "Placa Reta — 4 Furos",        ref: "21-800-ST-04",  system: "1.5mm", defaultZone: "",                    defaultScrews: [{ screwType: "monocortical" as const, selfTapping: true, diameter: "1.5" as const, length: 5, quantity: 4 }] },
  { key: "custom",     label: "Outra",         sublabel: "Placa Personalizada",         ref: "",               system: "",      defaultZone: "",                    defaultScrews: [] },
];

const ANATOMICAL_ZONE_LABELS: Record<string, string> = {
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

const PLATE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  PLATE_CATALOGUE.map(p => [p.key, p.label])
);

// ─── Sub-component: Screw Row ────────────────────────────────────────────────

interface ScrewRowProps {
  screw: ScrewRecord;
  onChange: (s: ScrewRecord) => void;
  onRemove: () => void;
  disabled: boolean;
}

function ScrewRow({ screw, onChange, onRemove, disabled }: ScrewRowProps) {
  const upd = (k: keyof ScrewRecord, v: any) => onChange({ ...screw, [k]: v });
  const showCustomLen = screw.length === 0;

  return (
    <div className="grid grid-cols-[1fr_auto_1fr_1fr_1fr_1.5fr_1fr_1.5fr_auto] gap-1.5 items-center py-1.5 border-b last:border-0">
      {/* Type */}
      <Select disabled={disabled} value={screw.screwType || ""} onValueChange={v => upd("screwType", v)}>
        <SelectTrigger className="h-7 text-xs">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="monocortical">Monocortical</SelectItem>
          <SelectItem value="bicortical">Bicortical</SelectItem>
          <SelectItem value="lag">Compressão</SelectItem>
          <SelectItem value="positional">Posicional</SelectItem>
        </SelectContent>
      </Select>

      {/* Self-tapping */}
      <div className="flex flex-col items-center gap-0.5 text-[9px] text-muted-foreground">
        <Switch
          checked={screw.selfTapping ?? false}
          onCheckedChange={v => upd("selfTapping", v)}
          disabled={disabled}
          className="scale-75"
        />
        <span>AP</span>
      </div>

      {/* Diameter */}
      <Select disabled={disabled} value={screw.diameter || ""} onValueChange={v => upd("diameter", v)}>
        <SelectTrigger className="h-7 text-xs">
          <SelectValue placeholder="Diâm." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1.5">1.5 mm</SelectItem>
          <SelectItem value="2.0">2.0 mm</SelectItem>
          <SelectItem value="2.4">2.4 mm</SelectItem>
          <SelectItem value="outro">Outro</SelectItem>
        </SelectContent>
      </Select>

      {/* Length */}
      <div className="flex gap-1">
        <Select disabled={disabled} value={screw.length?.toString() || ""} onValueChange={v => upd("length", Number(v))}>
          <SelectTrigger className="h-7 text-xs flex-1">
            <SelectValue placeholder="Comp." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="4">4 mm</SelectItem>
            <SelectItem value="5">5 mm</SelectItem>
            <SelectItem value="6">6 mm</SelectItem>
            <SelectItem value="8">8 mm</SelectItem>
            <SelectItem value="10">10 mm</SelectItem>
            <SelectItem value="12">12 mm</SelectItem>
            <SelectItem value="14">14 mm</SelectItem>
            <SelectItem value="16">16 mm</SelectItem>
            <SelectItem value="0">Outro</SelectItem>
          </SelectContent>
        </Select>
        {showCustomLen && (
          <Input
            type="number"
            placeholder="mm"
            value={screw.lengthCustom || ""}
            onChange={e => upd("lengthCustom", Number(e.target.value))}
            disabled={disabled}
            className="h-7 text-xs w-14 font-mono"
          />
        )}
      </div>

      {/* Quantity */}
      <Input
        type="number"
        min={1}
        value={screw.quantity ?? ""}
        onChange={e => upd("quantity", Number(e.target.value))}
        disabled={disabled}
        className="h-7 text-xs font-mono text-center"
        placeholder="Qtd"
      />

      {/* Reference */}
      <Input
        value={screw.reference || ""}
        onChange={e => upd("reference", e.target.value)}
        disabled={disabled}
        className="h-7 text-xs"
        placeholder="REF"
      />

      {/* Lot */}
      <Input
        value={screw.lot || ""}
        onChange={e => upd("lot", e.target.value)}
        disabled={disabled}
        className="h-7 text-xs"
        placeholder="Lote"
      />

      {/* Location */}
      <Input
        value={screw.location || ""}
        onChange={e => upd("location", e.target.value)}
        disabled={disabled}
        className="h-7 text-xs"
        placeholder="Localização"
      />

      {/* Remove */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={disabled}
        className="h-7 w-7 text-destructive/70 hover:text-destructive"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

// ─── Sub-component: Plate Card ───────────────────────────────────────────────

interface PlateCardProps {
  plate: PlateRecord;
  index: number;
  onChange: (p: PlateRecord) => void;
  onRemove: () => void;
  disabled: boolean;
}

function PlateCard({ plate, index, onChange, onRemove, disabled }: PlateCardProps) {
  const [expanded, setExpanded] = useState(false);
  const upd = (k: keyof PlateRecord, v: any) => onChange({ ...plate, [k]: v });

  const addScrew = () => {
    const newScrew: ScrewRecord = { screwType: "monocortical", selfTapping: true, diameter: "2.0", length: 5, quantity: 1 };
    onChange({ ...plate, screws: [...(plate.screws || []), newScrew] });
  };

  const updateScrew = (si: number, s: ScrewRecord) => {
    const screws = [...(plate.screws || [])];
    screws[si] = s;
    onChange({ ...plate, screws });
  };

  const removeScrew = (si: number) => {
    const screws = (plate.screws || []).filter((_, i) => i !== si);
    onChange({ ...plate, screws });
  };

  const typeLabel = plate.plateType ? (PLATE_TYPE_LABELS[plate.plateType] || plate.plateType) : "Placa";
  const zoneLabel = plate.anatomicalZone ? (ANATOMICAL_ZONE_LABELS[plate.anatomicalZone] || plate.anatomicalZone) : null;

  return (
    <div className="border border-border/60 rounded-sm bg-white shadow-xs">
      {/* Card header */}
      <div
        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(e => !e)}
        role="button"
        aria-expanded={expanded}
      >
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-muted/20 rounded-sm">
          <PlateSvgIcon plateType={plate.plateType || ""} size={36} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{typeLabel}</span>
            {zoneLabel && <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-primary/50 text-primary">{zoneLabel}</Badge>}
            {plate.system && <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{plate.system}</Badge>}
            {plate.brand && <span className="text-xs text-muted-foreground">{plate.brand}</span>}
            {plate.reference && <span className="text-xs font-mono text-muted-foreground">REF: {plate.reference}</span>}
          </div>
          {plate.screws && plate.screws.length > 0 && (
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {plate.screws.map((s, i) => `${s.quantity ?? "?"}× ${s.diameter ?? "?"}×${s.length ?? "?"}mm ${s.screwType === "bicortical" || s.screwType === "positional" ? "(bic.)" : ""}`).join("  ·  ")}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive/60 hover:text-destructive"
            onClick={e => { e.stopPropagation(); onRemove(); }}
            disabled={disabled}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t px-3 py-3 space-y-4 bg-muted/5">
          {/* Plate details grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Marca</Label>
              <Input value={plate.brand || ""} onChange={e => upd("brand", e.target.value)} disabled={disabled} className="h-8 text-xs" placeholder="KLS Martin / Stryker" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Sistema</Label>
              <Select disabled={disabled} value={plate.system || ""} onValueChange={v => upd("system", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sistema" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1.5mm">1.5 mm</SelectItem>
                  <SelectItem value="2.0mm">2.0 mm</SelectItem>
                  <SelectItem value="2.4mm">2.4 mm</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tipo de Placa</Label>
              <Select disabled={disabled} value={plate.plateType || ""} onValueChange={v => upd("plateType", v as any)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  {PLATE_CATALOGUE.map(pt => <SelectItem key={pt.key} value={pt.key}>{pt.sublabel}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Referência</Label>
              <Input value={plate.reference || ""} onChange={e => upd("reference", e.target.value)} disabled={disabled} className="h-8 text-xs font-mono" placeholder="REF fabricante" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Lote</Label>
              <Input value={plate.lot || ""} onChange={e => upd("lot", e.target.value)} disabled={disabled} className="h-8 text-xs font-mono" placeholder="Nº lote" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Quantidade</Label>
              <Input type="number" min={1} value={plate.quantity ?? 1} onChange={e => upd("quantity", Number(e.target.value))} disabled={disabled} className="h-8 text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Zona Anatómica</Label>
              <Select disabled={disabled} value={plate.anatomicalZone || ""} onValueChange={v => upd("anatomicalZone", v as any)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Zona" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ANATOMICAL_ZONE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Lado</Label>
              <Select disabled={disabled} value={plate.side || ""} onValueChange={v => upd("side", v as any)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Lado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="right">Direito</SelectItem>
                  <SelectItem value="left">Esquerdo</SelectItem>
                  <SelectItem value="bilateral">Bilateral</SelectItem>
                  <SelectItem value="central">Central</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Localização (texto livre)</Label>
              <Input value={plate.location || ""} onChange={e => upd("location", e.target.value)} disabled={disabled} className="h-8 text-xs" placeholder="ex: Pilar canino dir." />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Observações</Label>
            <Input value={plate.notes || ""} onChange={e => upd("notes", e.target.value)} disabled={disabled} className="h-8 text-xs" placeholder="Notas" />
          </div>

          {/* Screws section */}
          <div className="border rounded-sm bg-white">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/10">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Parafusos desta Placa</span>
              <Button onClick={addScrew} disabled={disabled} size="sm" variant="outline" className="h-6 text-[10px] uppercase tracking-wider px-2">
                <Plus className="mr-1 h-2.5 w-2.5" /> Parafuso
              </Button>
            </div>
            {(plate.screws || []).length === 0 ? (
              <div className="text-center py-3 text-xs text-muted-foreground italic">Sem parafusos registados.</div>
            ) : (
              <div className="px-2 py-1">
                {/* Header */}
                <div className="grid grid-cols-[1fr_auto_1fr_1fr_1fr_1.5fr_1fr_1.5fr_auto] gap-1.5 px-0 pb-1.5 text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">
                  <div>Tipo</div><div>AP</div><div>Diâm.</div><div>Comp.</div>
                  <div>Qtd.</div><div>Ref.</div><div>Lote</div><div>Localiz.</div><div></div>
                </div>
                {(plate.screws || []).map((s, si) => (
                  <ScrewRow
                    key={si}
                    screw={s}
                    onChange={ns => updateScrew(si, ns)}
                    onRemove={() => removeScrew(si)}
                    disabled={disabled}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-component: Drills table ─────────────────────────────────────────────

function DrillsTable({ drills, onChange, disabled }: { drills: DrillRecord[]; onChange: (d: DrillRecord[]) => void; disabled: boolean }) {
  const addRow = () => onChange([...drills, { brand: "KLS Martin", drillType: "twist", usedCount: 1 }]);
  const upd = (i: number, k: keyof DrillRecord, v: any) => {
    const next = [...drills]; next[i] = { ...next[i], [k]: v }; onChange(next);
  };
  const remove = (i: number) => onChange(drills.filter((_, idx) => idx !== i));

  return (
    <div className="border rounded-sm bg-white">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/10">
        <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
          <Wrench className="h-3 w-3" /> Brocas Utilizadas
        </span>
        <Button onClick={addRow} disabled={disabled} size="sm" variant="outline" className="h-6 text-[10px] uppercase tracking-wider px-2">
          <Plus className="mr-1 h-2.5 w-2.5" /> Adicionar
        </Button>
      </div>
      {drills.length === 0 ? (
        <div className="text-center py-3 text-xs text-muted-foreground italic">Sem brocas registadas.</div>
      ) : (
        <div className="p-2 space-y-1.5">
          <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] gap-2 text-[9px] uppercase tracking-wider font-semibold text-muted-foreground pb-1 border-b">
            <div>Marca</div><div>Diâm. (mm)</div><div>Tipo</div><div>Referência</div><div className="text-center">Usadas</div><div></div>
          </div>
          {drills.map((d, i) => (
            <div key={i} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] gap-2 items-center">
              <Input value={d.brand || ""} onChange={e => upd(i, "brand", e.target.value)} disabled={disabled} className="h-7 text-xs" placeholder="KLS Martin" />
              <Input value={d.diameter || ""} onChange={e => upd(i, "diameter", e.target.value)} disabled={disabled} className="h-7 text-xs font-mono" placeholder="1.5 / 2.0" />
              <Select disabled={disabled} value={d.drillType || ""} onValueChange={v => upd(i, "drillType", v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="twist">Helicoidal</SelectItem>
                  <SelectItem value="step">Escalonada</SelectItem>
                </SelectContent>
              </Select>
              <Input value={d.reference || ""} onChange={e => upd(i, "reference", e.target.value)} disabled={disabled} className="h-7 text-xs font-mono" placeholder="REF" />
              <Input type="number" min={1} value={d.usedCount ?? ""} onChange={e => upd(i, "usedCount", Number(e.target.value))} disabled={disabled} className="h-7 text-xs font-mono text-center" />
              <Button variant="ghost" size="icon" onClick={() => remove(i)} disabled={disabled} className="h-7 w-7 text-destructive/70 hover:text-destructive">
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sub-component: Saws table ───────────────────────────────────────────────

function SawsTable({ saws, onChange, disabled }: { saws: SawRecord[]; onChange: (s: SawRecord[]) => void; disabled: boolean }) {
  const addRow = () => onChange([...saws, { brand: "KLS Martin", sawType: "oscillating", usedCount: 1 }]);
  const upd = (i: number, k: keyof SawRecord, v: any) => {
    const next = [...saws]; next[i] = { ...next[i], [k]: v }; onChange(next);
  };
  const remove = (i: number) => onChange(saws.filter((_, idx) => idx !== i));

  return (
    <div className="border rounded-sm bg-white">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/10">
        <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
          <AlignJustify className="h-3 w-3" /> Serras / Lâminas Utilizadas
        </span>
        <Button onClick={addRow} disabled={disabled} size="sm" variant="outline" className="h-6 text-[10px] uppercase tracking-wider px-2">
          <Plus className="mr-1 h-2.5 w-2.5" /> Adicionar
        </Button>
      </div>
      {saws.length === 0 ? (
        <div className="text-center py-3 text-xs text-muted-foreground italic">Sem serras registadas.</div>
      ) : (
        <div className="p-2 space-y-1.5">
          <div className="grid grid-cols-[1.5fr_1fr_1.5fr_1fr_auto] gap-2 text-[9px] uppercase tracking-wider font-semibold text-muted-foreground pb-1 border-b">
            <div>Marca</div><div>Tipo</div><div>Ref. Lâmina</div><div className="text-center">Usadas</div><div></div>
          </div>
          {saws.map((s, i) => (
            <div key={i} className="grid grid-cols-[1.5fr_1fr_1.5fr_1fr_auto] gap-2 items-center">
              <Input value={s.brand || ""} onChange={e => upd(i, "brand", e.target.value)} disabled={disabled} className="h-7 text-xs" placeholder="KLS Martin" />
              <Select disabled={disabled} value={s.sawType || ""} onValueChange={v => upd(i, "sawType", v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="oscillating">Oscilante</SelectItem>
                  <SelectItem value="sagittal">Sagital</SelectItem>
                  <SelectItem value="reciprocating">Recíproca</SelectItem>
                </SelectContent>
              </Select>
              <Input value={s.bladeRef || ""} onChange={e => upd(i, "bladeRef", e.target.value)} disabled={disabled} className="h-7 text-xs font-mono" placeholder="REF lâmina" />
              <Input type="number" min={1} value={s.usedCount ?? ""} onChange={e => upd(i, "usedCount", Number(e.target.value))} disabled={disabled} className="h-7 text-xs font-mono text-center" />
              <Button variant="ghost" size="icon" onClick={() => remove(i)} disabled={disabled} className="h-7 w-7 text-destructive/70 hover:text-destructive">
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface IntraopSectionProps {
  record: IntraopRecord;
  updateRecord: (rec: IntraopRecord) => void;
  materials: OsteosynthesisMaterials;
  updateMaterials: (mat: OsteosynthesisMaterials) => void;
  piezo: PiezoEquipment;
  updatePiezo: (p: PiezoEquipment) => void;
  isFinalized: boolean;
}

export function IntraopSection({ record, updateRecord, materials, updateMaterials, piezo, updatePiezo, isFinalized }: IntraopSectionProps) {
  const [showLibrary, setShowLibrary] = useState(false);

  const plates = materials.plates || [];
  const drills = materials.drills || [];
  const saws = materials.saws || [];

  const handleRecordChange = (field: keyof IntraopRecord, value: any) => {
    if (isFinalized) return;
    updateRecord({ ...record, [field]: value });
  };

  const addPlateFromCatalogue = (catKey: string) => {
    if (isFinalized) return;
    const cat = PLATE_CATALOGUE.find(p => p.key === catKey);
    if (!cat) return;
    const newPlate: PlateRecord = {
      plateType: catKey as any,
      brand: "KLS Martin",
      system: cat.system as any,
      reference: cat.ref,
      lot: "",
      anatomicalZone: cat.defaultZone as any,
      side: catKey.includes("_right") || catKey === "BSSO_right" ? "right" : catKey.includes("_left") || catKey === "BSSO_left" ? "left" : catKey === "chin" || catKey === "square" ? "central" : "",
      location: cat.defaultZone ? (ANATOMICAL_ZONE_LABELS[cat.defaultZone] || "") : "",
      quantity: 1,
      notes: "",
      screws: cat.defaultScrews.map(s => ({ ...s, reference: "", lot: "", location: "" })),
      type: cat.sublabel,
      screwCount: cat.defaultScrews.reduce((sum, s) => sum + s.quantity, 0),
    };
    updateMaterials({ ...materials, plates: [...plates, newPlate] });
    setShowLibrary(false);
  };

  const addPlateFromCatalog = (plate: PlateRecord) => {
    if (isFinalized) return;
    updateMaterials({ ...materials, plates: [...plates, plate] });
    setShowLibrary(false);
  };

  const updatePlate = (i: number, p: PlateRecord) => {
    const next = [...plates]; next[i] = p;
    updateMaterials({ ...materials, plates: next });
  };

  const removePlate = (i: number) => {
    updateMaterials({ ...materials, plates: plates.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="space-y-6">

      {/* ── Timing & Blood ──────────────────────────────────────────── */}
      <Card className="shadow-xs border-border/50">
        <CardHeader>
          <CardTitle className="uppercase tracking-widest text-sm text-primary">Tempos Cirúrgicos & Sangramento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-4 border-r pr-8">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Anestesia</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Início</Label>
                  <Input type="time" value={record.anesthesiaStartTime || ""} onChange={e => handleRecordChange("anesthesiaStartTime", e.target.value)} disabled={isFinalized} className="font-mono text-lg h-12" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Fim</Label>
                  <Input type="time" value={record.anesthesiaEndTime || ""} onChange={e => handleRecordChange("anesthesiaEndTime", e.target.value)} disabled={isFinalized} className="font-mono text-lg h-12" />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Cirurgia</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Início</Label>
                  <Input type="time" value={record.surgeryStartTime || ""} onChange={e => handleRecordChange("surgeryStartTime", e.target.value)} disabled={isFinalized} className="font-mono text-lg h-12" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Fim</Label>
                  <Input type="time" value={record.surgeryEndTime || ""} onChange={e => handleRecordChange("surgeryEndTime", e.target.value)} disabled={isFinalized} className="font-mono text-lg h-12" />
                </div>
              </div>
            </div>
            <div className="col-span-2 pt-4 border-t grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Perda Sanguínea Estimada (ml)</Label>
                <Input type="number" value={record.estimatedBloodLoss || ""} onChange={e => handleRecordChange("estimatedBloodLoss", parseInt(e.target.value))} disabled={isFinalized} className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Fluidos Administrados (ml)</Label>
                <Input type="number" value={record.fluidAdministered || ""} onChange={e => handleRecordChange("fluidAdministered", parseInt(e.target.value))} disabled={isFinalized} className="font-mono" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Osteossíntese ──────────────────────────────────────────── */}
      <Card className="shadow-xs border-border/50">
        <CardHeader>
          <CardTitle className="uppercase tracking-widest text-sm text-primary">Materiais de Osteossíntese</CardTitle>
          <CardDescription>Placas, parafusos, brocas e serras utilizados na fixação</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Map + Library side by side */}
          <div className="flex gap-6 items-start">
            {/* Anatomical map */}
            <div className="flex-shrink-0">
              <AnatomicalMap plates={plates} readOnly />
            </div>

            {/* Plate library + placed list */}
            <div className="flex-1 space-y-4">
              {/* Library toggle button */}
              {!isFinalized && (
                <div>
                  <Button
                    variant="outline"
                    onClick={() => setShowLibrary(s => !s)}
                    className="uppercase tracking-widest text-xs h-9 w-full border-dashed border-primary/50 text-primary hover:bg-primary/5"
                  >
                    <Layers className="mr-2 h-4 w-4" />
                    {showLibrary ? "Fechar Biblioteca de Placas" : "Biblioteca de Placas — Adicionar"}
                  </Button>
                </div>
              )}

              {/* Plate library grid */}
              {showLibrary && (
                <div className="border border-primary/20 rounded-sm p-3 bg-primary/5 space-y-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-primary mb-2">Modelos genéricos — adição rápida</p>
                    <div className="grid grid-cols-5 gap-2">
                      {PLATE_CATALOGUE.map(cat => (
                        <button
                          key={cat.key}
                          onClick={() => addPlateFromCatalogue(cat.key)}
                          className="flex flex-col items-center gap-1.5 p-2 rounded-sm border border-border/60 bg-white hover:border-primary hover:bg-primary/5 transition-colors group text-center"
                        >
                          <PlateSvgIcon plateType={cat.key} size={48} />
                          <div className="text-[10px] font-semibold text-foreground leading-tight">{cat.label}</div>
                          {cat.ref && <div className="text-[9px] text-muted-foreground font-mono leading-tight">{cat.ref}</div>}
                          {cat.system && <Badge variant="secondary" className="text-[9px] h-4 px-1">{cat.system}</Badge>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Configurable manufacturer catalog (Osteomed / DELPHOS / …) */}
                  <PlateCatalogPicker onAddPlate={addPlateFromCatalog} />
                </div>
              )}

              {/* Placed plates */}
              {plates.length === 0 && !showLibrary ? (
                <div className="text-center py-8 border border-dashed rounded-sm bg-muted/10">
                  <Layers className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum implante registado.</p>
                  {!isFinalized && <p className="text-xs text-muted-foreground mt-1">Clique em "Biblioteca de Placas" para adicionar.</p>}
                </div>
              ) : (
                <div className="space-y-2">
                  {plates.map((plate, i) => (
                    <PlateCard
                      key={i}
                      plate={plate}
                      index={i}
                      onChange={p => updatePlate(i, p)}
                      onRemove={() => removePlate(i)}
                      disabled={isFinalized}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Drills */}
          <DrillsTable
            drills={drills}
            onChange={d => updateMaterials({ ...materials, drills: d })}
            disabled={isFinalized}
          />

          {/* Saws */}
          <SawsTable
            saws={saws}
            onChange={s => updateMaterials({ ...materials, saws: s })}
            disabled={isFinalized}
          />

        </CardContent>
      </Card>

      {/* ── Piezoelétrico ──────────────────────────────────────────── */}
      <PiezoBlock piezo={piezo} updatePiezo={updatePiezo} isFinalized={isFinalized} />
    </div>
  );
}
