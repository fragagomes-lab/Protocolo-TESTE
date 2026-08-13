import { useState } from "react";
import {
  useGetProtocol,
  useListPlanningImages,
  getListPlanningImagesQueryKey,
} from "@workspace/api-client-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";

interface Props {
  protocolId: number | null;
}

/**
 * Bloco compacto "Imagem de referência do planeamento" — mostra as imagens de
 * cirurgia virtual que originaram as medidas extraídas pela IA
 * (planAiAnalysis.extraction.sourceImageIds), com miniaturas clicáveis que
 * abrem ampliadas num Dialog.
 */
export function PlanReferenceImages({ protocolId }: Props) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  const { data: protocol } = useGetProtocol(protocolId as number, {
    query: { enabled: !!protocolId, queryKey: ["getProtocol", protocolId] },
  });

  const { data: images = [] } = useListPlanningImages(
    protocolId as number,
    {},
    { query: { enabled: !!protocolId, queryKey: getListPlanningImagesQueryKey(protocolId as number) } }
  );

  const sourceImageIds: number[] =
    ((protocol as any)?.planAiAnalysis?.extraction?.sourceImageIds as number[] | undefined) ?? [];

  if (!protocolId || sourceImageIds.length === 0) return null;

  const refImages = images.filter((img) => sourceImageIds.includes(img.id));
  if (refImages.length === 0) return null;

  return (
    <div className="rounded-sm border border-primary/20 bg-primary/5 p-4 space-y-3">
      <div className="text-xs uppercase tracking-widest font-bold text-primary">
        Imagem de referência do planeamento
      </div>
      <p className="text-[11px] text-muted-foreground">
        Imagens de cirurgia virtual que originaram as medidas extraídas por IA.
      </p>
      <div className="flex flex-wrap gap-2">
        {refImages.map((img) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setLightbox(img.servingUrl)}
            className="w-24 h-24 rounded-sm overflow-hidden border bg-white hover:border-primary transition-colors"
            title={img.caption || img.originalName || "Imagem de referência"}
          >
            <img src={img.servingUrl} alt={img.caption || "Imagem de referência"} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      <Dialog open={!!lightbox} onOpenChange={(open) => { if (!open) setLightbox(null); }}>
        <DialogContent className="max-w-5xl p-0 bg-black border-0 rounded-none" aria-label="Imagem de referência ampliada">
          {lightbox && (
            <div className="relative flex items-center justify-center min-h-[60vh]">
              <button
                onClick={() => setLightbox(null)}
                className="absolute top-3 right-3 z-10 bg-black/50 hover:bg-black/80 text-white rounded-sm p-1"
              >
                <X className="h-5 w-5" />
              </button>
              <img src={lightbox} alt="Imagem de referência" className="max-h-[80vh] max-w-full object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
