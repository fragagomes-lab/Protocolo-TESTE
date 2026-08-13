import { useRef, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Upload, Trash2, Check, Loader2 } from "lucide-react";

// ─── Bloco de assinatura (ecrã de geração) ──────────────────────────────────
// Permite:
//  • indicar quem assina em representação (persiste em signatureRepresentative)
//  • desenhar a assinatura manuscrita ou carregar imagem
//  • guardar o objectPath/servingUrl em signatureImagePath
//
// A componente não conhece a API — recebe callbacks assíncronos do ecrã que a
// aloja (que reutiliza o fluxo de storage existente: request-url + PUT + PATCH).

interface SignatureBlockEditorProps {
  representative: string;
  onRepresentativeCommit: (value: string) => void;
  signatureImageUrl: string | null;
  onUploadDataUrl: (dataUrl: string) => Promise<void>;
  onUploadFile: (file: File) => Promise<void>;
  onClearImage: () => Promise<void>;
  disabled?: boolean;
}

export function SignatureBlockEditor({
  representative,
  onRepresentativeCommit,
  signatureImageUrl,
  onUploadDataUrl,
  onUploadFile,
  onClearImage,
  disabled = false,
}: SignatureBlockEditorProps) {
  const padRef = useRef<SignatureCanvas | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [repDraft, setRepDraft] = useState(representative);

  useEffect(() => { setRepDraft(representative); }, [representative]);

  const handleSaveDrawing = async () => {
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) return;
    setBusy(true);
    try {
      // Recorta a assinatura e exporta como PNG transparente
      const dataUrl = pad.getTrimmedCanvas().toDataURL("image/png");
      await onUploadDataUrl(dataUrl);
      setDrawing(false);
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      await onUploadFile(file);
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    setBusy(true);
    try {
      await onClearImage();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-border rounded-sm p-4 bg-muted/10 space-y-4">
      <div className="text-sm font-bold uppercase tracking-widest text-primary">Assinatura</div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
          Assinado por (em representação)
        </label>
        <Input
          value={repDraft}
          onChange={(e) => setRepDraft(e.target.value)}
          onBlur={() => { if (repDraft !== representative) onRepresentativeCommit(repDraft); }}
          placeholder="Deixe em branco para assinatura do próprio"
          disabled={disabled}
          className="text-sm rounded-sm"
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          Se preenchido, o documento mostra «p/ Dr. António Matos da Fonseca» assinado por quem indicar.
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
          Assinatura manuscrita
        </label>

        {signatureImageUrl && !drawing ? (
          <div className="flex items-center gap-4">
            <img
              src={signatureImageUrl}
              alt="Assinatura"
              className="h-20 max-w-[240px] object-contain border border-border rounded-sm bg-white p-1"
            />
            <div className="flex flex-col gap-2">
              <Button type="button" size="sm" variant="outline" className="text-xs rounded-sm" disabled={disabled || busy} onClick={() => setDrawing(true)}>
                <Pencil className="mr-1.5 h-3 w-3" /> Desenhar nova
              </Button>
              <Button type="button" size="sm" variant="outline" className="text-xs rounded-sm" disabled={disabled || busy} onClick={handleClear}>
                {busy ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Trash2 className="mr-1.5 h-3 w-3" />} Remover
              </Button>
            </div>
          </div>
        ) : drawing ? (
          <div className="space-y-2">
            <div className="border border-border rounded-sm bg-white inline-block">
              <SignatureCanvas
                ref={padRef}
                penColor="#111827"
                canvasProps={{ width: 400, height: 140, className: "rounded-sm" }}
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" className="text-xs rounded-sm" disabled={busy} onClick={handleSaveDrawing}>
                {busy ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Check className="mr-1.5 h-3 w-3" />} Guardar assinatura
              </Button>
              <Button type="button" size="sm" variant="outline" className="text-xs rounded-sm" disabled={busy} onClick={() => padRef.current?.clear()}>
                Limpar
              </Button>
              <Button type="button" size="sm" variant="ghost" className="text-xs rounded-sm" disabled={busy} onClick={() => setDrawing(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" className="text-xs rounded-sm" disabled={disabled || busy} onClick={() => setDrawing(true)}>
              <Pencil className="mr-1.5 h-3 w-3" /> Desenhar
            </Button>
            <Button type="button" size="sm" variant="outline" className="text-xs rounded-sm" disabled={disabled || busy} onClick={() => fileRef.current?.click()}>
              {busy ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Upload className="mr-1.5 h-3 w-3" />} Carregar imagem
            </Button>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  );
}
