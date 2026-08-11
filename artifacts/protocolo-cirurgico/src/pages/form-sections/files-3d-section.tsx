import { useRef, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isFinalizedLockError, finalizedLockMessage } from "@/lib/finalized-error";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  useListFiles3d,
  useCreateFile3d,
  useUpdateFile3d,
  useDeleteFile3d,
  useRequestUploadUrl,
  getListFiles3dQueryKey,
  File3d,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Upload, Trash2, Download, Box, Loader2, Eye, EyeOff, ChevronDown, ChevronUp, X, AlertTriangle,
} from "lucide-react";

const FILE_TYPE_LABELS: Record<string, string> = {
  scanner_intraoral: "Scanner Intraoral",
  modelo_dentario: "Modelo Dentário",
  maxila: "Maxila",
  mandibula: "Mandíbula",
  cranio: "Crânio Completo",
  splint: "Splint / Goteira",
  guia_cirurgica: "Guia Cirúrgica",
  outro: "Outro",
};

// ─── 3D viewer ────────────────────────────────────────────────────────────────

function Viewer3D({ url, format }: { url: string; format: string }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;
    let raf = 0;
    let disposed = false;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf3f4f6);
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(1, 1, 1);
    scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0xffffff, 0.4);
    dir2.position.set(-1, -1, -1);
    scene.add(dir2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const onFrame = () => {
      if (disposed) return;
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(onFrame);
    };

    const fitAndAdd = (geometry: THREE.BufferGeometry) => {
      geometry.computeVertexNormals();
      geometry.center();
      const material = new THREE.MeshStandardMaterial({ color: 0x2d6b79, flatShading: false, metalness: 0.1, roughness: 0.6 });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      geometry.computeBoundingSphere();
      const radius = geometry.boundingSphere?.radius ?? 50;
      camera.position.set(0, 0, radius * 2.6);
      camera.near = radius / 100;
      camera.far = radius * 100;
      camera.updateProjectionMatrix();
      controls.update();
      setStatus("ready");
      onFrame();
    };

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("fetch failed");
        const buf = await res.arrayBuffer();
        if (disposed) return;
        if (format === "ply") {
          const geometry = new PLYLoader().parse(buf);
          fitAndAdd(geometry);
        } else {
          const geometry = new STLLoader().parse(buf);
          fitAndAdd(geometry);
        }
      } catch {
        if (!disposed) setStatus("error");
      }
    })();

    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [url, format]);

  return (
    <div className="relative w-full h-[60vh] bg-gray-100">
      <div ref={mountRef} className="w-full h-full" />
      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-xs">A carregar modelo 3D…</span>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2 p-6 text-center">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
          <span className="text-sm font-medium">Não foi possível pré-visualizar este ficheiro.</span>
          <span className="text-xs">Descarregue o ficheiro para o abrir num visualizador dedicado.</span>
        </div>
      )}
    </div>
  );
}

// ─── File card ────────────────────────────────────────────────────────────────

function File3dCard({ file, onPatch, onDelete, onPreview, disabled }: {
  file: File3d;
  onPatch: (data: Record<string, unknown>) => void;
  onDelete: () => void;
  onPreview: () => void;
  disabled: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border/60 rounded-sm bg-white shadow-xs">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-primary/10 rounded-sm">
          <Box className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground truncate">{file.originalName || "Ficheiro 3D"}</span>
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-primary/50 text-primary uppercase">{file.fileFormat}</Badge>
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{FILE_TYPE_LABELS[file.fileType] || file.fileType}</Badge>
            {!file.includeInPdf && <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-muted-foreground">Fora do relatório</Badge>}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {[file.origin, file.fileDate, file.version && `v${file.version}`].filter(Boolean).join("  ·  ") || "Sem metadados"}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="sm" className="h-8 text-xs uppercase tracking-wider text-primary" onClick={onPreview}>
            <Eye className="h-3.5 w-3.5 mr-1" /> Ver 3D
          </Button>
          <a href={file.servingUrl} download={file.originalName || `modelo.${file.fileFormat}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Descarregar">
              <Download className="h-4 w-4" />
            </Button>
          </a>
          <button onClick={() => setExpanded(e => !e)} className="p-1 text-muted-foreground">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t px-3 py-3 space-y-3 bg-muted/5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tipo</label>
              <Select disabled={disabled} value={file.fileType} onValueChange={v => onPatch({ fileType: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FILE_TYPE_LABELS).map(([k, l]) => <SelectItem key={k} value={k} className="text-xs">{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Origem</label>
              <Input disabled={disabled} value={file.origin || ""} onChange={e => onPatch({ origin: e.target.value })} className="h-8 text-xs" placeholder="ex: Scanner iTero, TAC…" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Data</label>
              <Input disabled={disabled} type="date" value={file.fileDate || ""} onChange={e => onPatch({ fileDate: e.target.value })} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Versão</label>
              <Input disabled={disabled} value={file.version || ""} onChange={e => onPatch({ version: e.target.value })} className="h-8 text-xs" placeholder="ex: 1, pré-op…" />
            </div>
            <div className="space-y-1 col-span-2 md:col-span-2">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Observações</label>
              <Input disabled={disabled} value={file.notes || ""} onChange={e => onPatch({ notes: e.target.value })} className="h-8 text-xs" placeholder="Notas" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => onPatch({ includeInPdf: !file.includeInPdf })}
              disabled={disabled}
              className={`flex items-center gap-1.5 text-xs ${file.includeInPdf ? "text-primary" : "text-muted-foreground"}`}
            >
              {file.includeInPdf ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {file.includeInPdf ? "Incluído no inventário do relatório" : "Fora do relatório"}
            </button>
            <Button variant="ghost" size="sm" onClick={onDelete} disabled={disabled} className="h-7 text-xs text-destructive/70 hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

interface Files3dSectionProps {
  protocolId: number | null;
  isFinalized?: boolean;
}

export function Files3dSection({ protocolId, isFinalized = false }: Files3dSectionProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [preview, setPreview] = useState<File3d | null>(null);

  const { data: files = [], isLoading } = useListFiles3d(protocolId as number, {
    query: { enabled: !!protocolId, queryKey: getListFiles3dQueryKey(protocolId as number) },
  });

  const { mutateAsync: requestUpload } = useRequestUploadUrl();
  const { mutateAsync: createFile } = useCreateFile3d();
  const { mutateAsync: updateFile } = useUpdateFile3d();
  const { mutateAsync: deleteFile } = useDeleteFile3d();

  const invalidate = () => {
    if (protocolId) queryClient.invalidateQueries({ queryKey: getListFiles3dQueryKey(protocolId) });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!protocolId || !e.target.files) return;
    const selected = Array.from(e.target.files);
    e.target.value = "";

    for (const file of selected) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "stl" && ext !== "ply") {
        toast.error(`${file.name}: apenas ficheiros .stl ou .ply são suportados.`);
        continue;
      }
      setUploadingCount(c => c + 1);
      try {
        const contentType = file.type || "application/octet-stream";
        const { uploadURL, objectPath } = await requestUpload({
          data: { name: file.name, size: file.size, contentType },
        });
        await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": contentType } });
        await createFile({
          id: protocolId,
          data: {
            objectPath,
            servingUrl: "/api/storage" + objectPath,
            originalName: file.name,
            fileFormat: ext as any,
            fileType: "outro" as any,
            fileDate: new Date().toISOString().split("T")[0],
            includeInPdf: true,
          },
        });
        invalidate();
        toast.success(`${file.name} carregado.`);
      } catch (e) {
        if (isFinalizedLockError(e)) {
          toast.error(finalizedLockMessage(e), {
            description: "Reabra o protocolo para adicionar ficheiros.",
          });
          break;
        }
        toast.error(`Erro ao carregar ${file.name}.`);
      } finally {
        setUploadingCount(c => c - 1);
      }
    }
  };

  const patch = async (file: File3d, data: Record<string, unknown>) => {
    if (!protocolId) return;
    try {
      await updateFile({ id: protocolId, fileId: file.id, data });
      invalidate();
    } catch (e) {
      if (isFinalizedLockError(e)) {
        toast.error(finalizedLockMessage(e), {
          description: "Reabra o protocolo para editar ficheiros.",
        });
        return;
      }
      toast.error("Erro ao actualizar o ficheiro.");
    }
  };

  const handleDelete = async (file: File3d) => {
    if (!protocolId) return;
    if (!window.confirm(`Eliminar "${file.originalName || "ficheiro 3D"}"?`)) return;
    try {
      await deleteFile({ id: protocolId, fileId: file.id });
      invalidate();
      toast.success("Ficheiro eliminado.");
    } catch (e) {
      if (isFinalizedLockError(e)) {
        toast.error(finalizedLockMessage(e), {
          description: "Reabra o protocolo para eliminar ficheiros.",
        });
        return;
      }
      toast.error("Erro ao eliminar.");
    }
  };

  if (!protocolId) {
    return (
      <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-sm p-4 text-blue-800 text-sm">
        <Box className="h-5 w-5 flex-shrink-0" />
        Guarde o protocolo antes de adicionar ficheiros 3D.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input ref={fileInputRef} type="file" accept=".stl,.ply" multiple className="hidden" onChange={handleFileChange} />

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Ficheiros STL e PLY — scanners, modelos, splints e guias cirúrgicas.</p>
        <div className="flex items-center gap-2">
          {uploadingCount > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />A carregar {uploadingCount}…
            </span>
          )}
          {!isFinalized && (
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploadingCount > 0} size="sm" className="uppercase tracking-widest text-xs bg-primary hover:bg-primary/90">
              <Upload className="mr-2 h-3 w-3" /> Adicionar STL / PLY
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="border rounded-sm animate-pulse bg-muted h-16" />)}</div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground border border-dashed rounded-sm">
          <Box className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">Sem ficheiros 3D.</p>
          <p className="text-xs mt-1">Carregue ficheiros STL ou PLY para os identificar e visualizar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map(file => (
            <File3dCard
              key={file.id}
              file={file}
              onPatch={data => patch(file, data)}
              onDelete={() => handleDelete(file)}
              onPreview={() => setPreview(file)}
              disabled={isFinalized}
            />
          ))}
        </div>
      )}

      {/* 3D preview dialog */}
      <Dialog open={!!preview} onOpenChange={open => { if (!open) setPreview(null); }}>
        <DialogContent className="max-w-5xl p-0 rounded-sm overflow-hidden" aria-label="Visualizador 3D">
          {preview && (
            <div>
              <div className="flex items-center justify-between px-4 py-2.5 border-b bg-white">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{preview.originalName || "Modelo 3D"}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {FILE_TYPE_LABELS[preview.fileType] || preview.fileType} · {preview.fileFormat.toUpperCase()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a href={preview.servingUrl} download={preview.originalName || `modelo.${preview.fileFormat}`}>
                    <Button variant="outline" size="sm" className="h-8 text-xs uppercase tracking-wider">
                      <Download className="h-3.5 w-3.5 mr-1" /> Descarregar
                    </Button>
                  </a>
                  <button onClick={() => setPreview(null)} className="p-1 text-muted-foreground hover:text-foreground">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <Viewer3D url={preview.servingUrl} format={preview.fileFormat} />
              <div className="px-4 py-2 text-[11px] text-muted-foreground bg-muted/20 border-t">
                Arraste para rodar · roda do rato para zoom · botão direito para mover.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
