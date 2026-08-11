import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useGetProtocol,
  useClassifyPlanningImagesAi,
  useExtractPlanAi,
  useReviewPlanAi,
  PlanningImage,
  SurgicalPlan,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, AlertTriangle, CheckCircle2, XCircle, Pencil, Brain } from "lucide-react";

// ── Tipos (o JSON da análise é livre no contrato; tipamos localmente) ──
export interface AiProposal {
  id: string;
  targetField?: string;
  label?: string;
  value?: number | null;
  unit?: string | null;
  side?: string | null;
  sourceImageId?: number;
  referenceText?: string;
  undetermined?: boolean;
  note?: string;
  review?: { status: "confirmed" | "corrected" | "rejected"; value?: number | null; unit?: string | null; at: string } | null;
}
export interface AiAnalysis {
  classification?: { at: string; model: string; counts?: Record<string, number> };
  extraction?: { at: string; sourceImageIds?: number[]; proposals?: AiProposal[]; reviewCompletedAt?: string | null };
  diagnosis?: {
    at: string;
    suggestions?: Array<{ diagnosis?: string; rationale?: string; confidence?: string; sourceImageIds?: number[] }>;
    uncertain?: boolean;
    comment?: string;
    status?: "pending" | "confirmed" | "rejected";
    confirmedText?: string | null;
    confirmedAt?: string | null;
  };
}

function useAnalysis(protocolId: number | null): AiAnalysis | null {
  const { data } = useGetProtocol(protocolId as number, {
    query: { enabled: !!protocolId, queryKey: ["getProtocol", protocolId] },
  });
  return ((data as any)?.planAiAnalysis as AiAnalysis) ?? null;
}

function errMessage(e: unknown): { code?: string; message: string } {
  const resp = (e as any)?.response?.data ?? (e as any)?.data ?? null;
  if (resp?.error) return { code: resp.error, message: resp.message || resp.error };
  return { message: "Erro inesperado na comunicação com o servidor." };
}

// ─────────────────────────────────────────────────────────────
// Painel das 2 fases (usado na etapa Planeamento 3D)
// ─────────────────────────────────────────────────────────────
export function AiPlanningPanel({
  protocolId,
  images,
  isFinalized,
  invalidateImages,
}: {
  protocolId: number;
  images: PlanningImage[];
  isFinalized: boolean;
  invalidateImages: () => void;
}) {
  const queryClient = useQueryClient();
  const analysis = useAnalysis(protocolId);
  const classify = useClassifyPlanningImagesAi();
  const extract = useExtractPlanAi();
  const [aiError, setAiError] = useState<string | null>(null);

  const invalidateProtocol = () =>
    queryClient.invalidateQueries({ queryKey: ["getProtocol", protocolId] });

  const confirmedFinals = images.filter((img) => (img as any).isFinalMeasurement === true);
  const selected = confirmedFinals.filter((img) => (img as any).selectedForExtraction);

  const runClassify = async (force = false) => {
    setAiError(null);
    if (force && !window.confirm("Repetir a classificação por IA tem custos e substitui as sugestões anteriores. Continuar?")) return;
    try {
      await classify.mutateAsync({ id: protocolId, data: { force } });
      invalidateImages();
      invalidateProtocol();
      toast.success("Classificação concluída — reveja e confirme as sugestões.");
    } catch (e) {
      const { code, message } = errMessage(e);
      if (code === "already_classified") { runClassify(true); return; }
      setAiError(message);
    }
  };

  const runExtract = async (force = false) => {
    setAiError(null);
    if (force && !window.confirm("Repetir a extração tem custos e substitui as propostas por rever. Continuar?")) return;
    try {
      await extract.mutateAsync({ id: protocolId, data: { imageIds: selected.map((i) => i.id), force } });
      invalidateProtocol();
      toast.success("Extração concluída — reveja as propostas na etapa Plano Cirúrgico.");
    } catch (e) {
      const { code, message } = errMessage(e);
      if (code === "already_extracted") { runExtract(true); return; }
      setAiError(message);
    }
  };

  return (
    <Card className="border-2 border-primary/30 bg-primary/[0.03] shadow-xs">
      <CardHeader className="py-4">
        <CardTitle className="uppercase tracking-widest text-sm text-primary flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> Análise por IA do Planeamento Virtual
        </CardTitle>
        <CardDescription>
          Nada é analisado automaticamente. As imagens permanecem sempre arquivadas — a IA apenas sugere; a decisão é do cirurgião.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {aiError && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-sm p-3 text-sm text-red-800">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{aiError}</span>
          </div>
        )}

        {/* FASE 1 */}
        <div className="flex items-center justify-between gap-4 border rounded-sm bg-white p-3">
          <div className="text-sm">
            <div className="font-semibold">1ª fase — Classificar imagens</div>
            <div className="text-xs text-muted-foreground">
              A IA sugere quais parecem conter medidas finais e quais são intermédias.{" "}
              {analysis?.classification && (
                <span className="text-primary font-medium">
                  Última análise: {new Date(analysis.classification.at).toLocaleString("pt-PT")}.
                </span>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant={analysis?.classification ? "outline" : "default"}
            disabled={classify.isPending || isFinalized || images.length === 0}
            onClick={() => runClassify(false)}
            className="uppercase tracking-widest text-xs flex-shrink-0"
          >
            {classify.isPending ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Sparkles className="mr-2 h-3 w-3" />}
            {analysis?.classification ? "Repetir análise" : "Analisar imagens"}
          </Button>
        </div>

        {/* FASE 2 */}
        <div className="flex items-center justify-between gap-4 border rounded-sm bg-white p-3">
          <div className="text-sm">
            <div className="font-semibold">2ª fase — Extrair medidas & sugerir diagnóstico</div>
            <div className="text-xs text-muted-foreground">
              Só interpreta as imagens que confirmou como medidas finais e selecionou ({selected.length} selecionada(s)).{" "}
              {analysis?.extraction && (
                <span className="text-primary font-medium">
                  Última extração: {new Date(analysis.extraction.at).toLocaleString("pt-PT")}.
                </span>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant={analysis?.extraction ? "outline" : "default"}
            disabled={extract.isPending || isFinalized || selected.length === 0}
            onClick={() => runExtract(false)}
            className="uppercase tracking-widest text-xs flex-shrink-0"
          >
            {extract.isPending ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Brain className="mr-2 h-3 w-3" />}
            {analysis?.extraction ? "Repetir extração" : "Extrair medidas"}
          </Button>
        </div>

        {(classify.isPending || extract.isPending) && (
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" /> A analisar com IA… pode demorar um pouco. Não feche a página.
          </div>
        )}

        <AiDiagnosisCard protocolId={protocolId} images={images} isFinalized={isFinalized} />
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Diagnóstico sugerido pela IA — por confirmar
// ─────────────────────────────────────────────────────────────
function AiDiagnosisCard({ protocolId, images, isFinalized }: { protocolId: number; images: PlanningImage[]; isFinalized: boolean }) {
  const queryClient = useQueryClient();
  const analysis = useAnalysis(protocolId);
  const review = useReviewPlanAi();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");

  const diag = analysis?.diagnosis;
  if (!diag || !diag.suggestions?.length) return null;

  const imgName = (id?: number) => {
    const img = images.find((i) => i.id === id);
    return img?.originalName || img?.caption || (id ? `Imagem #${id}` : "");
  };

  const submit = async (status: "confirmed" | "rejected", confirmedText?: string) => {
    try {
      await review.mutateAsync({ id: protocolId, data: { diagnosis: { status, confirmedText } } });
      queryClient.invalidateQueries({ queryKey: ["getProtocol", protocolId] });
      setEditing(false);
      toast.success(status === "confirmed" ? "Diagnóstico confirmado pelo cirurgião." : "Sugestão de diagnóstico rejeitada.");
    } catch {
      toast.error("Erro ao guardar a revisão do diagnóstico.");
    }
  };

  const startEdit = () => {
    setText(diag.confirmedText || diag.suggestions?.[0]?.diagnosis || "");
    setEditing(true);
  };

  return (
    <div className={`border-2 rounded-sm p-4 space-y-3 ${diag.status === "confirmed" ? "border-green-300 bg-green-50/40" : diag.status === "rejected" ? "border-border bg-muted/20" : "border-violet-300 bg-violet-50/40"}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest font-bold flex items-center gap-2 text-violet-800">
          <Brain className="h-4 w-4" />
          {diag.status === "confirmed" ? "Diagnóstico confirmado/revisto pelo cirurgião" : diag.status === "rejected" ? "Diagnóstico sugerido pela IA — rejeitado" : "Diagnóstico sugerido pela IA — por confirmar"}
        </div>
        {diag.status !== "pending" && diag.confirmedAt && (
          <span className="text-[10px] text-muted-foreground">{new Date(diag.confirmedAt).toLocaleString("pt-PT")}</span>
        )}
      </div>

      {diag.status === "confirmed" ? (
        <p className="text-sm font-medium whitespace-pre-wrap">{diag.confirmedText}</p>
      ) : (
        <div className="space-y-2">
          {diag.suggestions.map((s, i) => (
            <div key={i} className="bg-white border rounded-sm p-3 text-sm space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{s.diagnosis}</span>
                {s.confidence && <Badge variant="outline" className="text-[10px] uppercase">{`confiança ${s.confidence}`}</Badge>}
              </div>
              {s.rationale && <p className="text-xs text-muted-foreground">{s.rationale}</p>}
              {!!s.sourceImageIds?.length && (
                <p className="text-[10px] text-muted-foreground">Fonte: {s.sourceImageIds.map(imgName).join("; ")}</p>
              )}
            </div>
          ))}
          {diag.uncertain && (
            <p className="text-xs text-violet-800 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> A informação não é inequívoca — a IA apresenta hipóteses, não um diagnóstico definitivo.
            </p>
          )}
        </div>
      )}

      {!isFinalized && diag.status !== "confirmed" && (
        editing ? (
          <div className="space-y-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="w-full text-sm rounded-sm border bg-white p-2"
              placeholder="Texto final do diagnóstico, revisto pelo cirurgião…"
            />
            <div className="flex gap-2">
              <Button size="sm" disabled={review.isPending || !text.trim()} onClick={() => submit("confirmed", text.trim())} className="text-xs uppercase tracking-widest">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Confirmar este texto
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="text-xs uppercase tracking-widest">Cancelar</Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" disabled={review.isPending} onClick={() => submit("confirmed", diag.suggestions?.[0]?.diagnosis || "")} className="text-xs uppercase tracking-widest">
              <CheckCircle2 className="mr-1 h-3 w-3" /> Aceitar
            </Button>
            <Button size="sm" variant="outline" disabled={review.isPending} onClick={startEdit} className="text-xs uppercase tracking-widest">
              <Pencil className="mr-1 h-3 w-3" /> Modificar
            </Button>
            <Button size="sm" variant="outline" disabled={review.isPending} onClick={() => submit("rejected")} className="text-xs uppercase tracking-widest text-destructive">
              <XCircle className="mr-1 h-3 w-3" /> Rejeitar
            </Button>
          </div>
        )
      )}
      {diag.status === "confirmed" && !isFinalized && (
        <Button size="sm" variant="ghost" onClick={startEdit} className="text-xs uppercase tracking-widest">
          <Pencil className="mr-1 h-3 w-3" /> Rever novamente
        </Button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Revisão das propostas (usado na etapa Plano Cirúrgico)
// ─────────────────────────────────────────────────────────────
export function AiProposalsReview({
  protocolId,
  plan,
  updatePlan,
  isFinalized,
  images,
}: {
  protocolId: number | null;
  plan: SurgicalPlan;
  updatePlan: (p: SurgicalPlan) => void;
  isFinalized: boolean;
  images?: PlanningImage[];
}) {
  const queryClient = useQueryClient();
  const analysis = useAnalysis(protocolId);
  const review = useReviewPlanAi();
  const [correcting, setCorrecting] = useState<string | null>(null);
  const [correctValue, setCorrectValue] = useState("");

  const proposals = analysis?.extraction?.proposals ?? [];
  if (!protocolId || proposals.length === 0) return null;

  const pending = proposals.filter((p) => !p.review);
  const reviewComplete = !!analysis?.extraction?.reviewCompletedAt;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["getProtocol", protocolId] });

  const send = async (body: Record<string, unknown>, ok: string) => {
    try {
      await review.mutateAsync({ id: protocolId, data: body });
      invalidate();
      toast.success(ok);
    } catch (e) {
      toast.error(errMessage(e).message);
    }
  };

  const setStatus = (p: AiProposal, status: "confirmed" | "rejected") =>
    send({ proposals: [{ id: p.id, status }] }, status === "confirmed" ? "Proposta confirmada." : "Proposta rejeitada.");

  const submitCorrection = (p: AiProposal) => {
    const v = parseFloat(correctValue.replace(",", "."));
    if (isNaN(v)) { toast.error("Valor inválido."); return; }
    send({ proposals: [{ id: p.id, status: "corrected", value: v }] }, "Proposta corrigida.");
    setCorrecting(null);
  };

  const globalConfirm = async () => {
    await send({ globalConfirm: true }, "Revisão global confirmada.");
  };

  // Aplicar os valores confirmados/corrigidos ao plano (rascunho local — é preciso Guardar)
  const applyToPlan = () => {
    let next: SurgicalPlan = JSON.parse(JSON.stringify(plan ?? {}));
    let applied = 0;
    const setMove = (obj: any, field: string, v: number) => { obj.movements = { ...(obj.movements ?? {}), [field]: v }; };
    for (const p of proposals) {
      if (!p.review || p.review.status === "rejected") continue;
      const v = p.review.value;
      if (v === null || v === undefined || !p.targetField) continue;
      const t = p.targetField;
      const num = Number(v);
      if (t.startsWith("maxilla.segment.")) {
        const [, , segName, field] = t.split(".");
        next.maxilla = next.maxilla ?? { included: true };
        const segs: any[] = (next.maxilla.segments as any[]) ?? [{ segment: "total", movements: {} }];
        let seg = segs.find((s) => s.segment === segName);
        if (!seg) { seg = { segment: segName, movements: {} }; segs.push(seg); }
        seg.movements = { ...(seg.movements ?? {}), [field]: num };
        (next.maxilla as any).segments = segs;
        applied++;
      } else if (t.startsWith("maxilla.")) {
        const field = t.split(".")[1];
        next.maxilla = next.maxilla ?? { included: true };
        const segs: any[] = (next.maxilla.segments as any[]) ?? [];
        if (segs.length === 0) segs.push({ segment: "total", movements: {} });
        segs[0].movements = { ...(segs[0].movements ?? {}), [field]: num };
        (next.maxilla as any).segments = segs;
        applied++;
      } else if (t.startsWith("mandible.")) {
        const field = t.split(".")[1];
        next.mandible = next.mandible ?? { included: true };
        setMove(next.mandible, field, num);
        applied++;
      } else if (t.startsWith("chin.")) {
        let field = t.split(".")[1];
        if (field === "transverse") field = "transverseRight";
        next.chin = next.chin ?? { included: true };
        setMove(next.chin, field, num);
        applied++;
      }
      // targetField "other" não tem campo direto — fica registado na análise
    }
    updatePlan(next);
    toast.success(`${applied} valor(es) aplicados ao plano (rascunho). Verifique e clique em Salvar.`);
  };

  const imgLabel = (id?: number) => {
    const img = images?.find((i) => i.id === id);
    return img?.originalName || img?.caption || (id ? `Imagem #${id}` : "—");
  };

  const statusBadge = (p: AiProposal) => {
    if (!p.review) return <Badge className="bg-amber-100 text-amber-800 border-amber-300 border text-[10px] uppercase">Por confirmar</Badge>;
    if (p.review.status === "confirmed") return <Badge className="bg-green-100 text-green-800 border-green-300 border text-[10px] uppercase">Confirmada</Badge>;
    if (p.review.status === "corrected") return <Badge className="bg-blue-100 text-blue-800 border-blue-300 border text-[10px] uppercase">Corrigida</Badge>;
    return <Badge className="bg-red-100 text-red-800 border-red-300 border text-[10px] uppercase">Rejeitada</Badge>;
  };

  const fmt = (v: number | null | undefined, unit?: string | null) =>
    v === null || v === undefined ? "—" : `${Number(v).toFixed(2)} ${unit === "deg" ? "°" : unit ?? ""}`;

  return (
    <Card className="border-2 border-violet-300 bg-violet-50/30 shadow-xs">
      <CardHeader className="py-4">
        <CardTitle className="uppercase tracking-widest text-sm text-violet-800 flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> Propostas da IA — pré-preenchimento do plano
        </CardTitle>
        <CardDescription>
          Extraídas das imagens confirmadas em {analysis?.extraction && new Date(analysis.extraction.at).toLocaleString("pt-PT")}. Nenhum valor entra no plano sem a sua confirmação.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {proposals.map((p) => (
          <div key={p.id} className="bg-white border rounded-sm p-3 text-sm space-y-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="font-semibold">{p.label || p.targetField}</div>
              {statusBadge(p)}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs">
              <div><span className="text-muted-foreground">Valor lido:</span> <span className="font-mono font-semibold">{p.undetermined ? "não determinado" : fmt(p.value, p.unit)}</span></div>
              {p.side && <div><span className="text-muted-foreground">Lado:</span> {p.side === "left" ? "esquerdo" : p.side === "right" ? "direito" : "bilateral"}</div>}
              <div className="col-span-2"><span className="text-muted-foreground">Imagem de origem:</span> {imgLabel(p.sourceImageId)}</div>
              {p.referenceText && <div className="col-span-2 sm:col-span-4"><span className="text-muted-foreground">Referência lida:</span> "{p.referenceText}"</div>}
              {p.review?.status === "corrected" && (
                <div className="col-span-2"><span className="text-muted-foreground">Valor corrigido:</span> <span className="font-mono font-semibold">{fmt(p.review.value, p.review.unit)}</span></div>
              )}
            </div>
            {p.undetermined && (
              <p className="text-xs text-amber-700 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Não foi possível determinar com segurança — {p.note || "valor ilegível ou ambíguo."}</p>
            )}
            {!isFinalized && !p.review && (
              correcting === p.id ? (
                <div className="flex items-center gap-2">
                  <Input value={correctValue} onChange={(e) => setCorrectValue(e.target.value)} placeholder="Valor correto" className="h-7 w-32 font-mono text-xs" />
                  <Button size="sm" className="h-7 text-xs" onClick={() => submitCorrection(p)} disabled={review.isPending}>Guardar</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCorrecting(null)}>Cancelar</Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  {!p.undetermined && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" disabled={review.isPending} onClick={() => setStatus(p, "confirmed")}>
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Confirmar
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="h-7 text-xs" disabled={review.isPending} onClick={() => { setCorrecting(p.id); setCorrectValue(p.value != null ? String(p.value) : ""); }}>
                    <Pencil className="mr-1 h-3 w-3" /> Corrigir
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" disabled={review.isPending} onClick={() => setStatus(p, "rejected")}>
                    <XCircle className="mr-1 h-3 w-3" /> Rejeitar
                  </Button>
                </div>
              )
            )}
          </div>
        ))}

        {!isFinalized && (
          <div className="flex items-center justify-between pt-2 border-t flex-wrap gap-2">
            <div className="text-xs text-muted-foreground">
              {pending.length > 0
                ? `${pending.length} proposta(s) por rever — a confirmação global só fica disponível depois de rever todas.`
                : reviewComplete
                  ? `Revisão global confirmada em ${new Date(analysis!.extraction!.reviewCompletedAt!).toLocaleString("pt-PT")}.`
                  : "Todas as propostas foram revistas."}
            </div>
            <div className="flex gap-2">
              {!reviewComplete && (
                <Button size="sm" variant="outline" disabled={pending.length > 0 || review.isPending} onClick={globalConfirm} className="text-xs uppercase tracking-widest">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Confirmação global
                </Button>
              )}
              <Button
                size="sm"
                disabled={!reviewComplete || proposals.every((p) => !p.review || p.review.status === "rejected")}
                title={!reviewComplete ? "Disponível apenas após a confirmação global" : undefined}
                onClick={applyToPlan}
                className="text-xs uppercase tracking-widest"
              >
                Aplicar confirmados ao plano
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
