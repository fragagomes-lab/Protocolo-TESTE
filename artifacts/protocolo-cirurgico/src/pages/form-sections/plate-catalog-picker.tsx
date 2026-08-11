import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useListPlateCatalog,
  useCreatePlateCatalogEntry,
  useDeletePlateCatalogEntry,
  getListPlateCatalogQueryKey,
  PlateCatalogEntry,
  PlateRecord,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, PackagePlus, Trash2, ChevronRight, Loader2 } from "lucide-react";

const MANUFACTURERS: { value: string; label: string }[] = [
  { value: "osteomed", label: "Osteomed" },
  { value: "delphos", label: "DELPHOS" },
  { value: "outro", label: "Outro" },
];

interface PlateCatalogPickerProps {
  onAddPlate: (plate: PlateRecord) => void;
}

const emptyDraft = { manufacturer: "osteomed", system: "", plateType: "", geometry: "", side: "", region: "", reference: "", screwInfo: "", notes: "" };

export function PlateCatalogPicker({ onAddPlate }: PlateCatalogPickerProps) {
  const queryClient = useQueryClient();
  const [manufacturer, setManufacturer] = useState("osteomed");
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState({ ...emptyDraft });

  const { data: entries = [], isLoading } = useListPlateCatalog(
    { manufacturer: manufacturer as any },
    { query: { queryKey: getListPlateCatalogQueryKey({ manufacturer: manufacturer as any }) } }
  );

  const { mutateAsync: createEntry, isPending: creating } = useCreatePlateCatalogEntry();
  const { mutateAsync: deleteEntry } = useDeletePlateCatalogEntry();

  // Generated query keys are ["/api/plate-catalog", params], so match by the
  // resource path prefix rather than a hand-written key that never matches.
  const invalidate = () =>
    queryClient.invalidateQueries({
      predicate: query => {
        const key = query.queryKey?.[0];
        return typeof key === "string" && key.includes("/plate-catalog");
      },
    });

  const catalogToPlate = (entry: PlateCatalogEntry): PlateRecord => {
    const manuLabel = MANUFACTURERS.find(m => m.value === entry.manufacturer)?.label || entry.manufacturer;
    const descr = [entry.plateType, entry.geometry, entry.region, entry.side].filter(Boolean).join(" · ");
    const sysEnum = ["1.5mm", "2.0mm", "2.4mm"].includes(entry.system || "") ? (entry.system as any) : undefined;
    return {
      plateType: "custom" as any,
      brand: manuLabel,
      system: sysEnum,
      reference: entry.reference,
      lot: "",
      quantity: 1,
      location: descr,
      notes: [descr, entry.screwInfo, entry.notes].filter(Boolean).join(" — "),
      screws: [],
      type: descr || entry.reference,
    };
  };

  const handleCreate = async () => {
    if (!draft.reference.trim()) {
      toast.error("A referência é obrigatória.");
      return;
    }
    try {
      const created = await createEntry({
        data: {
          manufacturer: draft.manufacturer as any,
          system: draft.system || undefined,
          plateType: draft.plateType || undefined,
          geometry: draft.geometry || undefined,
          side: draft.side || undefined,
          region: draft.region || undefined,
          reference: draft.reference.trim(),
          screwInfo: draft.screwInfo || undefined,
          notes: draft.notes || undefined,
        },
      });
      invalidate();
      toast.success("Referência adicionada ao catálogo.");
      setDraft({ ...emptyDraft, manufacturer: draft.manufacturer });
      setShowNew(false);
      setManufacturer(created.manufacturer);
    } catch {
      toast.error("Erro ao criar referência.");
    }
  };

  const handleDelete = async (entry: PlateCatalogEntry) => {
    if (!window.confirm(`Remover a referência "${entry.reference}" do catálogo?`)) return;
    try {
      await deleteEntry({ entryId: entry.id });
      invalidate();
      toast.success("Referência removida.");
    } catch {
      toast.error("Erro ao remover.");
    }
  };

  return (
    <div className="border border-primary/20 rounded-sm bg-white">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-primary/5">
        <span className="text-[11px] uppercase tracking-wider font-semibold text-primary flex items-center gap-1.5">
          <PackagePlus className="h-3.5 w-3.5" /> Catálogo de Referências
        </span>
        <div className="flex items-center gap-1">
          {MANUFACTURERS.map(m => (
            <button
              key={m.value}
              onClick={() => setManufacturer(m.value)}
              className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm transition-colors ${manufacturer === m.value ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-2 space-y-1.5 max-h-56 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-4 text-muted-foreground text-xs gap-1"><Loader2 className="h-3 w-3 animate-spin" /> A carregar…</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-4 text-xs text-muted-foreground italic">Sem referências para este fabricante. Adicione a primeira abaixo.</div>
        ) : (
          entries.map(entry => (
            <div key={entry.id} className="flex items-center gap-2 px-2 py-1.5 border rounded-sm hover:border-primary/50 transition-colors group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-semibold text-foreground">{entry.reference}</span>
                  {entry.system && <span className="text-[10px] text-muted-foreground">{entry.system}</span>}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {[entry.plateType, entry.geometry, entry.region, entry.side, entry.screwInfo].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[10px] uppercase tracking-wider px-2 text-primary border-primary/40"
                onClick={() => onAddPlate(catalogToPlate(entry))}
              >
                Usar <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
              <button onClick={() => handleDelete(entry)} className="p-1 text-muted-foreground/40 hover:text-destructive" title="Remover do catálogo">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="border-t p-2">
        {!showNew ? (
          <Button variant="ghost" size="sm" className="w-full h-7 text-[10px] uppercase tracking-wider text-primary" onClick={() => { setShowNew(true); setDraft({ ...emptyDraft, manufacturer }); }}>
            <Plus className="h-3 w-3 mr-1" /> Nova Referência
          </Button>
        ) : (
          <div className="space-y-2 bg-muted/20 rounded-sm p-2">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <Select value={draft.manufacturer} onValueChange={v => setDraft(d => ({ ...d, manufacturer: v }))}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{MANUFACTURERS.map(m => <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>)}</SelectContent>
              </Select>
              <Input value={draft.reference} onChange={e => setDraft(d => ({ ...d, reference: e.target.value }))} placeholder="Referência *" className="h-7 text-xs font-mono" />
              <Input value={draft.system} onChange={e => setDraft(d => ({ ...d, system: e.target.value }))} placeholder="Sistema (2.0mm)" className="h-7 text-xs" />
              <Input value={draft.plateType} onChange={e => setDraft(d => ({ ...d, plateType: e.target.value }))} placeholder="Tipo (L, reta…)" className="h-7 text-xs" />
              <Input value={draft.geometry} onChange={e => setDraft(d => ({ ...d, geometry: e.target.value }))} placeholder="Geometria (4F…)" className="h-7 text-xs" />
              <Input value={draft.region} onChange={e => setDraft(d => ({ ...d, region: e.target.value }))} placeholder="Região" className="h-7 text-xs" />
              <Input value={draft.side} onChange={e => setDraft(d => ({ ...d, side: e.target.value }))} placeholder="Lado" className="h-7 text-xs" />
              <Input value={draft.screwInfo} onChange={e => setDraft(d => ({ ...d, screwInfo: e.target.value }))} placeholder="Info parafusos" className="h-7 text-xs" />
              <Input value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} placeholder="Notas" className="h-7 text-xs" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase tracking-wider" onClick={() => setShowNew(false)}>Cancelar</Button>
              <Button size="sm" className="h-7 text-[10px] uppercase tracking-wider" onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Guardar Referência"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
