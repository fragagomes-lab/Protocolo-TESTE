import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isFinalizedLockError, finalizedLockMessage } from "@/lib/finalized-error";
import {
  useListPlanningImages,
  useCreatePlanningImage,
  useUpdatePlanningImage,
  useDeletePlanningImage,
  useRequestUploadUrl,
  getListPlanningImagesQueryKey,
  PlanningImage,
  setPhotoIncludedInReport,
  setPhotoAsHeader,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Upload,
  Trash2,
  Eye,
  EyeOff,
  Star,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Loader2,
  Camera,
  Calendar,
} from "lucide-react";

// Clinical photo galleries — backed by the planning-images resource, but
// restricted to the clinical photo categories so it stays separate from the
// 3D-planning imagery step.
const GALLERIES: { category: string; title: string; hint: string }[] = [
  { category: "foto_extraoral", title: "Fotografia Extraoral", hint: "Frontal, perfil, sorriso, ¾…" },
  { category: "foto_intraoral", title: "Fotografia Intraoral", hint: "Oclusão, arcadas, mordida…" },
  { category: "foto_clinica_outra", title: "Outras Fotografias Clínicas", hint: "Documentação diversa" },
];

const CATEGORY_LABELS: Record<string, string> = {
  foto_extraoral: "Extraoral",
  foto_intraoral: "Intraoral",
  foto_clinica_outra: "Outra",
};

const CLINICAL_CATEGORIES = GALLERIES.map(g => g.category);

interface ClinicalPhotosSectionProps {
  protocolId: number | null;
  isFinalized?: boolean;
}

export function ClinicalPhotosSection({ protocolId, isFinalized = false }: ClinicalPhotosSectionProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadCategoryRef = useRef<string>("foto_extraoral");

  const [uploadingCount, setUploadingCount] = useState(0);
  const [lightbox, setLightbox] = useState<{ list: PlanningImage[]; index: number } | null>(null);

  const { data: allImages = [], isLoading } = useListPlanningImages(
    protocolId as number,
    {},
    { query: { enabled: !!protocolId, queryKey: getListPlanningImagesQueryKey(protocolId as number) } }
  );

  const { mutateAsync: requestUpload } = useRequestUploadUrl();
  const { mutateAsync: createImage } = useCreatePlanningImage();
  const { mutateAsync: updateImage } = useUpdatePlanningImage();
  const { mutateAsync: deleteImage } = useDeletePlanningImage();

  const invalidate = () => {
    if (protocolId) queryClient.invalidateQueries({ queryKey: getListPlanningImagesQueryKey(protocolId) });
  };

  const clinicalImages = allImages.filter(img => CLINICAL_CATEGORIES.includes(img.category));
  const headerPhoto = clinicalImages.find(img => img.isHeaderPhoto);

  const triggerUpload = (category: string) => {
    uploadCategoryRef.current = category;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!protocolId || !e.target.files) return;
    const files = Array.from(e.target.files);
    e.target.value = "";
    const category = uploadCategoryRef.current;

    for (const file of files) {
      setUploadingCount(c => c + 1);
      try {
        const { uploadURL, objectPath } = await requestUpload({
          data: { name: file.name, size: file.size, contentType: file.type },
        });
        await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
        await createImage({
          id: protocolId,
          data: {
            objectPath,
            servingUrl: "/api/storage" + objectPath,
            originalName: file.name,
            category: category as any,
            captureDate: new Date().toISOString().split("T")[0],
            includeInPdf: true,
          },
        });
        invalidate();
        toast.success(`${file.name} carregada.`);
      } catch (e) {
        if (isFinalizedLockError(e)) {
          toast.error(finalizedLockMessage(e), {
            description: "Reabra o protocolo para adicionar fotografias.",
          });
          break;
        }
        toast.error(`Erro ao carregar ${file.name}.`);
      } finally {
        setUploadingCount(c => c - 1);
      }
    }
  };

  const patch = async (img: PlanningImage, data: Record<string, unknown>) => {
    if (!protocolId) return;
    try {
      await updateImage({ id: protocolId, imageId: img.id, data });
      invalidate();
    } catch (e) {
      if (isFinalizedLockError(e)) {
        toast.error(finalizedLockMessage(e), {
          description: "Reabra o protocolo para editar fotografias.",
        });
        return;
      }
      toast.error("Erro ao actualizar a fotografia.");
    }
  };

  const handleDelete = async (img: PlanningImage) => {
    if (!protocolId) return;
    if (!window.confirm(`Eliminar "${img.originalName || "fotografia"}"?`)) return;
    try {
      await deleteImage({ id: protocolId, imageId: img.id });
      invalidate();
      toast.success("Fotografia eliminada.");
    } catch (e) {
      if (isFinalizedLockError(e)) {
        toast.error(finalizedLockMessage(e), {
          description: "Reabra o protocolo para eliminar fotografias.",
        });
        return;
      }
      toast.error("Erro ao eliminar.");
    }
  };

  if (!protocolId) {
    return (
      <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-sm p-4 text-blue-800 text-sm">
        <ImageOff className="h-5 w-5 flex-shrink-0" />
        Guarde o protocolo antes de adicionar fotografias clínicas.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />

      {/* Header photo */}
      <div className="flex gap-5 items-center bg-muted/10 border border-border/60 rounded-sm p-4">
        <div className="w-32 h-32 flex-shrink-0 bg-muted/30 border rounded-sm overflow-hidden flex items-center justify-center">
          {headerPhoto ? (
            <img
              src={headerPhoto.servingUrl}
              alt="Fotografia principal"
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setLightbox({ list: clinicalImages, index: clinicalImages.indexOf(headerPhoto) })}
            />
          ) : (
            <Camera className="h-8 w-8 text-muted-foreground/40" />
          )}
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-primary uppercase tracking-wider">Fotografia Principal do Processo</div>
          <p className="text-xs text-muted-foreground mt-1">
            {headerPhoto
              ? "Esta imagem surge no cabeçalho da ficha e do relatório. Marque outra fotografia com a estrela para a substituir."
              : "Marque uma fotografia extraoral com a estrela (★) para a definir como imagem principal."}
          </p>
        </div>
      </div>

      {uploadingCount > 0 && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />A carregar {uploadingCount} ficheiro(s)…
        </div>
      )}

      {/* Galleries */}
      {GALLERIES.map(gallery => {
        const images = clinicalImages
          .filter(img => img.category === gallery.category)
          .sort((a, b) => a.displayOrder - b.displayOrder);
        return (
          <div key={gallery.category} className="space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">{gallery.title}</h3>
                <p className="text-[11px] text-muted-foreground">{gallery.hint}</p>
              </div>
              {!isFinalized && (
                <Button
                  onClick={() => triggerUpload(gallery.category)}
                  disabled={uploadingCount > 0}
                  size="sm"
                  variant="outline"
                  className="uppercase tracking-widest text-xs"
                >
                  <Upload className="mr-2 h-3 w-3" /> Adicionar
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map(i => <div key={i} className="border rounded-sm animate-pulse bg-muted h-40" />)}
              </div>
            ) : images.length === 0 ? (
              <div className="text-xs text-muted-foreground italic py-6 text-center border border-dashed rounded-sm">
                Sem fotografias nesta galeria.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {images.map((img, idx) => (
                  <div key={img.id} className="relative border rounded-sm bg-white shadow-xs group overflow-hidden">
                    <div className="relative">
                      <img
                        src={img.servingUrl}
                        alt={img.caption || img.originalName || "Fotografia"}
                        className="w-full h-36 object-cover cursor-pointer"
                        onClick={() => setLightbox({ list: images, index: idx })}
                      />
                      {img.isHeaderPhoto && (
                        <Badge className="absolute top-1.5 left-1.5 text-[9px] rounded-sm bg-primary text-white border-0 uppercase tracking-wider gap-0.5">
                          <Star className="h-2.5 w-2.5 fill-white" /> Principal
                        </Badge>
                      )}
                      {!img.includeInPdf && (
                        <div className="absolute top-1.5 right-1.5 bg-black/50 rounded-sm p-0.5">
                          <EyeOff className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="p-2 space-y-2">
                      <Input
                        value={img.caption || ""}
                        onChange={e => patch(img, { caption: e.target.value })}
                        placeholder="Legenda…"
                        disabled={isFinalized}
                        className="text-[11px] h-7"
                      />
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <Input
                          type="date"
                          value={img.captureDate || ""}
                          onChange={e => patch(img, { captureDate: e.target.value })}
                          disabled={isFinalized}
                          className="text-[11px] h-7 px-1"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() =>
                            patch(
                              img,
                              { ...setPhotoIncludedInReport(
                                { includeInPdf: !!img.includeInPdf, isHeaderPhoto: !!img.isHeaderPhoto },
                                !img.includeInPdf
                              ) }
                            )
                          }
                          disabled={isFinalized}
                          className={`p-1 rounded-sm transition-colors ${img.includeInPdf ? "text-primary" : "text-muted-foreground/40"}`}
                          title={img.includeInPdf ? "Incluída no relatório" : "Excluída do relatório"}
                        >
                          {img.includeInPdf ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </button>
                        {gallery.category === "foto_extraoral" && (
                          <button
                            onClick={() =>
                              patch(
                                img,
                                { ...setPhotoAsHeader(
                                  { includeInPdf: !!img.includeInPdf, isHeaderPhoto: !!img.isHeaderPhoto },
                                  !img.isHeaderPhoto
                                ) }
                              )
                            }
                            disabled={isFinalized}
                            className={`p-1 rounded-sm transition-colors ${img.isHeaderPhoto ? "text-amber-500" : "text-muted-foreground/40 hover:text-amber-500"}`}
                            title="Definir como fotografia principal"
                          >
                            <Star className={`h-3.5 w-3.5 ${img.isHeaderPhoto ? "fill-amber-500" : ""}`} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(img)}
                          disabled={isFinalized}
                          className="p-1 rounded-sm text-muted-foreground hover:text-destructive transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={open => { if (!open) setLightbox(null); }}>
        <DialogContent className="max-w-5xl p-0 bg-black border-0 rounded-none" aria-label="Visualizador de fotografia">
          {lightbox && lightbox.list[lightbox.index] && (
            <div className="relative flex flex-col items-center justify-center min-h-[60vh]">
              <button onClick={() => setLightbox(null)} className="absolute top-3 right-3 z-10 bg-black/50 hover:bg-black/80 text-white rounded-sm p-1">
                <X className="h-5 w-5" />
              </button>
              <a
                href={lightbox.list[lightbox.index].servingUrl}
                download={lightbox.list[lightbox.index].originalName || "fotografia"}
                className="absolute top-3 left-3 z-10 bg-black/50 hover:bg-black/80 text-white rounded-sm p-1"
                title="Descarregar"
              >
                <Download className="h-5 w-5" />
              </a>
              {lightbox.index > 0 && (
                <button onClick={() => setLightbox(l => l && { ...l, index: l.index - 1 })} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/80 text-white rounded-sm p-2">
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}
              {lightbox.index < lightbox.list.length - 1 && (
                <button onClick={() => setLightbox(l => l && { ...l, index: l.index + 1 })} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/80 text-white rounded-sm p-2">
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}
              <img
                src={lightbox.list[lightbox.index].servingUrl}
                alt={lightbox.list[lightbox.index].caption || "Fotografia"}
                className="max-h-[80vh] max-w-full object-contain"
              />
              <div className="w-full bg-black/70 p-3 text-center">
                <p className="text-white text-sm">{lightbox.list[lightbox.index].caption || lightbox.list[lightbox.index].originalName || ""}</p>
                <p className="text-white/50 text-xs mt-1">
                  {CATEGORY_LABELS[lightbox.list[lightbox.index].category] || lightbox.list[lightbox.index].category}
                  {lightbox.list[lightbox.index].captureDate ? ` • ${lightbox.list[lightbox.index].captureDate}` : ""}
                  {" • "}{lightbox.index + 1} / {lightbox.list.length}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
