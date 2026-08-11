import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useListPlanningImages,
  useCreatePlanningImage,
  useUpdatePlanningImage,
  useDeletePlanningImage,
  useReorderPlanningImages,
  useRequestUploadUrl,
  getListPlanningImagesQueryKey,
  PlanningImageCategory,
  PlanningImageUpdateCategory,
  PlanningImage,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Upload,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Loader2,
} from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  fotografias_clinicas: "Fotografias Clínicas",
  cefalometria: "Cefalometria / Radiologia",
  renders_3d: "Renders 3D",
  tecidos_moles: "Simulação Tecidos Moles",
  osteotomias: "Osteotomias Planeadas",
  movimentos_osseos: "Movimentos Ósseos",
  splints_guias: "Splints / Guias Cirúrgicos",
  comparacao_pre_pos: "Comparação Pré/Pós",
  outros: "Outros",
};

interface PlanningSectionProps {
  protocolId: number | null;
}

export function PlanningSection({ protocolId }: PlanningSectionProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editCategory, setEditCategory] = useState<string>("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { data: images = [], isLoading } = useListPlanningImages(
    protocolId as number,
    {},
    { query: { enabled: !!protocolId, queryKey: getListPlanningImagesQueryKey(protocolId as number) } }
  );

  const { mutateAsync: requestUploadMutateAsync } = useRequestUploadUrl();
  const { mutateAsync: createImageMutateAsync } = useCreatePlanningImage();
  const { mutateAsync: updateImageMutateAsync } = useUpdatePlanningImage();
  const { mutateAsync: deleteImageMutateAsync } = useDeletePlanningImage();
  const { mutateAsync: reorderMutateAsync } = useReorderPlanningImages();

  const invalidate = () => {
    if (protocolId) {
      queryClient.invalidateQueries({ queryKey: getListPlanningImagesQueryKey(protocolId) });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!protocolId || !e.target.files) return;
    const files = Array.from(e.target.files);
    e.target.value = "";

    for (const file of files) {
      const key = `${file.name}-${Date.now()}`;
      setUploadingFiles(prev => new Set(prev).add(key));
      try {
        const { uploadURL, objectPath } = await requestUploadMutateAsync({
          data: { name: file.name, size: file.size, contentType: file.type },
        });
        await fetch(uploadURL, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        const servingUrl = "/api/storage" + objectPath;
        await createImageMutateAsync({
          id: protocolId,
          data: {
            objectPath,
            servingUrl,
            originalName: file.name,
            category: PlanningImageCategory.outros as any,
            includeInPdf: true,
          },
        });
        invalidate();
        toast.success(`${file.name} carregado com sucesso.`);
      } catch {
        toast.error(`Erro ao carregar ${file.name}.`);
      } finally {
        setUploadingFiles(prev => {
          const s = new Set(prev);
          s.delete(key);
          return s;
        });
      }
    }
  };

  const handleTogglePdf = async (image: PlanningImage) => {
    if (!protocolId) return;
    try {
      await updateImageMutateAsync({
        id: protocolId,
        imageId: image.id,
        data: { includeInPdf: !image.includeInPdf },
      });
      invalidate();
    } catch {
      toast.error("Erro ao actualizar imagem.");
    }
  };

  const handleDelete = async (image: PlanningImage) => {
    if (!protocolId) return;
    if (!window.confirm(`Eliminar "${image.originalName || "imagem"}"?`)) return;
    try {
      await deleteImageMutateAsync({ id: protocolId, imageId: image.id });
      invalidate();
      toast.success("Imagem eliminada.");
    } catch {
      toast.error("Erro ao eliminar imagem.");
    }
  };

  const handleStartEdit = (image: PlanningImage) => {
    setEditingId(image.id);
    setEditCaption(image.caption || "");
    setEditCategory(image.category);
  };

  const handleSaveEdit = async (image: PlanningImage) => {
    if (!protocolId) return;
    try {
      await updateImageMutateAsync({
        id: protocolId,
        imageId: image.id,
        data: {
          caption: editCaption,
          category: editCategory as PlanningImageUpdateCategory,
        },
      });
      invalidate();
      setEditingId(null);
      toast.success("Imagem actualizada.");
    } catch {
      toast.error("Erro ao actualizar imagem.");
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    if (!protocolId) return;
    const sorted = [...images].sort((a, b) => a.displayOrder - b.displayOrder);
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sorted.length) return;
    const newOrder = sorted.map(img => img.id);
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    try {
      await reorderMutateAsync({ id: protocolId, data: { orderedIds: newOrder } });
      invalidate();
    } catch {
      toast.error("Erro ao reordenar imagens.");
    }
  };

  const sortedImages = [...images].sort((a, b) => a.displayOrder - b.displayOrder);
  const filteredImages =
    activeCategory === "all" ? sortedImages : sortedImages.filter(img => img.category === activeCategory);

  const presentCategories = Array.from(new Set(images.map(img => img.category)));

  const lightboxImages = filteredImages;
  const lightboxImage = lightboxIndex !== null ? lightboxImages[lightboxIndex] : null;

  if (!protocolId) {
    return (
      <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-sm p-4 text-blue-800 text-sm">
        <ImageOff className="h-5 w-5 flex-shrink-0" />
        Guarde o protocolo antes de adicionar imagens de planeamento.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border transition-colors rounded-sm ${
              activeCategory === "all"
                ? "bg-primary text-white border-primary"
                : "bg-white text-muted-foreground border-border hover:border-primary"
            }`}
          >
            Todas {images.length > 0 && `(${images.length})`}
          </button>
          {presentCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border transition-colors rounded-sm ${
                activeCategory === cat
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-muted-foreground border-border hover:border-primary"
              }`}
            >
              {CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {uploadingFiles.size > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />A carregar {uploadingFiles.size} ficheiro(s)...
            </span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFiles.size > 0}
            className="uppercase tracking-widest text-xs bg-primary hover:bg-primary/90"
            size="sm"
          >
            <Upload className="mr-2 h-3 w-3" />
            Adicionar
          </Button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="border rounded-sm animate-pulse bg-muted h-64" />
          ))}
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground border border-dashed rounded-sm">
          <ImageOff className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-sm font-medium">Sem imagens.</p>
          <p className="text-xs mt-1">Clique em Adicionar para carregar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredImages.map((image, index) => {
            const isEditing = editingId === image.id;
            return (
              <div
                key={image.id}
                className="relative border rounded-none hover:border-primary shadow-sm transition-colors bg-white group"
              >
                {/* Thumbnail */}
                <div className="relative">
                  <img
                    src={image.servingUrl}
                    alt={image.caption || image.originalName || "Imagem"}
                    className="w-full h-40 object-cover cursor-pointer"
                    onClick={() => setLightboxIndex(index)}
                  />
                  {/* Category badge */}
                  <Badge className="absolute top-2 left-2 text-[10px] rounded-sm bg-sidebar text-white border-0 uppercase tracking-wider">
                    {CATEGORY_LABELS[image.category] || image.category}
                  </Badge>
                  {/* PDF excluded indicator */}
                  {!image.includeInPdf && (
                    <div className="absolute top-2 right-2 bg-black/50 rounded-sm p-0.5">
                      <EyeOff className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="p-3 space-y-2">
                  {isEditing ? (
                    <div className="space-y-2">
                      <Input
                        value={editCaption}
                        onChange={e => setEditCaption(e.target.value)}
                        placeholder="Legenda..."
                        className="text-xs h-7"
                      />
                      <Select value={editCategory} onValueChange={setEditCategory}>
                        <SelectTrigger className="text-xs h-7">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                            <SelectItem key={val} value={val} className="text-xs">
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button size="sm" className="h-6 text-xs flex-1" onClick={() => handleSaveEdit(image)}>
                          Guardar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs flex-1"
                          onClick={() => setEditingId(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground truncate min-h-[16px]">
                        {image.caption || image.originalName || <span className="italic opacity-50">Sem legenda</span>}
                      </p>
                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStartEdit(image)}
                            className="p-1 rounded-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleTogglePdf(image)}
                            className={`p-1 rounded-sm transition-colors ${
                              image.includeInPdf
                                ? "text-primary hover:text-primary/70"
                                : "text-muted-foreground/40 hover:text-muted-foreground"
                            }`}
                            title={image.includeInPdf ? "Incluído no PDF" : "Excluído do PDF"}
                          >
                            {image.includeInPdf ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={() => handleDelete(image)}
                            className="p-1 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleMove(index, "up")}
                            disabled={index === 0}
                            className="p-1 rounded-sm text-muted-foreground hover:text-primary disabled:opacity-20 transition-colors"
                            title="Mover para cima"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleMove(index, "down")}
                            disabled={index === filteredImages.length - 1}
                            className="p-1 rounded-sm text-muted-foreground hover:text-primary disabled:opacity-20 transition-colors"
                            title="Mover para baixo"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      <Dialog
        open={lightboxIndex !== null}
        onOpenChange={open => {
          if (!open) setLightboxIndex(null);
        }}
      >
        <DialogContent className="max-w-5xl p-0 bg-black border-0 rounded-none" aria-label="Visualizador de imagem">
          {lightboxImage && (
            <div className="relative flex flex-col items-center justify-center min-h-[60vh]">
              {/* Close */}
              <button
                onClick={() => setLightboxIndex(null)}
                className="absolute top-3 right-3 z-10 bg-black/50 hover:bg-black/80 text-white rounded-sm p-1 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              {/* Download */}
              <a
                href={lightboxImage.servingUrl}
                download={lightboxImage.originalName || "imagem"}
                className="absolute top-3 left-3 z-10 bg-black/50 hover:bg-black/80 text-white rounded-sm p-1 transition-colors"
                title="Descarregar"
              >
                <Download className="h-5 w-5" />
              </a>
              {/* Prev */}
              {lightboxIndex! > 0 && (
                <button
                  onClick={() => setLightboxIndex(lightboxIndex! - 1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/80 text-white rounded-sm p-2 transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}
              {/* Next */}
              {lightboxIndex! < lightboxImages.length - 1 && (
                <button
                  onClick={() => setLightboxIndex(lightboxIndex! + 1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/80 text-white rounded-sm p-2 transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}
              <img
                src={lightboxImage.servingUrl}
                alt={lightboxImage.caption || lightboxImage.originalName || "Imagem"}
                className="max-h-[80vh] max-w-full object-contain"
              />
              <div className="w-full bg-black/70 p-3 text-center">
                <p className="text-white text-sm">
                  {lightboxImage.caption || lightboxImage.originalName || ""}
                </p>
                <p className="text-white/50 text-xs mt-1">
                  {CATEGORY_LABELS[lightboxImage.category] || lightboxImage.category} &bull;{" "}
                  {lightboxIndex! + 1} / {lightboxImages.length}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
