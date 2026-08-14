// ── Separador "Preparação" — fase inicial da linha temporal do protocolo ────
// Fora do fluxo multi-step do formulário. Estruturado para futura linha
// temporal: Preparação → Cirurgia Virtual → Cirurgia → Pós-operatório.
import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  AlertTriangle,
  CalendarClock,
  CheckCircle,
  ExternalLink,
  History,
  Loader2,
} from "lucide-react";

import {
  useGetProtocol,
  useUpdateProtocol,
  getGetProtocolQueryKey,
  type Preparation,
  type PrepItem,
  type PrepProduct,
  type PrepAlert,
} from "@workspace/api-client-react";
import { isFinalizedLockError, finalizedLockMessage } from "@/lib/finalized-error";
import {
  PREP_BLOCKS,
  PREP_ALERTS,
  PREP_PRODUCTS,
  APPLIANCE_LABELS,
  SEGMENTATION_LABELS,
  ITEM_STATUS_LABELS,
  PRODUCT_STATUS_LABELS,
  PRODUCT_STATUS_ORDER,
  INSTRUCTIONS_APP_URL,
  buildPrepContext,
  isItemApplicable,
  isProductApplicable,
  effectiveItemStatus,
  effectiveProductStatus,
  computeActivationDeadline,
  deadlineState,
  type Appliance,
  type Segmentation,
} from "@/lib/preparation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

const ITEM_STATUS_CYCLE = ["todo", "done", "na"] as const;

export function ProtocolPreparation() {
  const { id } = useParams<{ id: string }>();
  const protocolId = Number(id);
  const queryClient = useQueryClient();

  const { data: protocol, isLoading } = useGetProtocol(protocolId, {
    query: { enabled: !!protocolId, queryKey: ["getProtocol", protocolId] },
  });

  const updateMutation = useUpdateProtocol();

  const [prep, setPrep] = useState<Preparation>({});
  const [appliance, setAppliance] = useState<string>("");
  const initializedForId = useRef<number | null>(null);

  // Fila de gravações latest-wins (mesma convenção do formulário principal)
  const saveChainRef = useRef<Promise<unknown>>(Promise.resolve());
  const prepRef = useRef(prep);
  const applianceRef = useRef(appliance);
  useEffect(() => { prepRef.current = prep; }, [prep]);
  useEffect(() => { applianceRef.current = appliance; }, [appliance]);

  useEffect(() => {
    if (protocol && protocol.id !== initializedForId.current) {
      initializedForId.current = protocol.id;
      const base: Preparation = { phase: "preparation", ...(protocol.preparation || {}) };
      // Migração: checklist genérica antiga passa a "Histórico" (uma única vez)
      if (!base.legacyChecklist?.length && protocol.checklist?.length) {
        base.legacyChecklist = protocol.checklist;
      }
      setPrep(base);
      setAppliance(protocol.orthoAppliance || "");
    }
  }, [protocol]);

  const isFinalized = protocol?.status === "finalized";

  const persist = (nextPrep: Preparation, nextAppliance?: string) => {
    setPrep(nextPrep);
    if (nextAppliance !== undefined) setAppliance(nextAppliance);
    // Sincronizar as refs IMEDIATAMENTE (não esperar pelo useEffect): a mutação
    // enfileirada lê as refs quando sai da fila e podia gravar um snapshot
    // anterior se a promise arrancasse antes do efeito correr.
    prepRef.current = nextPrep;
    if (nextAppliance !== undefined) applianceRef.current = nextAppliance;
    if (isFinalized) return;
    const run = saveChainRef.current
      .catch(() => {})
      .then(async () => {
        await updateMutation.mutateAsync({
          id: protocolId,
          data: {
            preparation: prepRef.current,
            orthoAppliance: applianceRef.current || null,
          } as any,
        });
      })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: getGetProtocolQueryKey(protocolId) });
      })
      .catch((e) => {
        if (isFinalizedLockError(e)) toast.error(finalizedLockMessage(e));
        else toast.error("Erro ao gravar a preparação");
        console.error(e);
      });
    saveChainRef.current = run;
  };

  if (isLoading || !protocol) {
    return (
      <div className="flex-1 p-4 md:p-8">
        <Skeleton className="h-12 w-full max-w-2xl mb-8" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const ctx = buildPrepContext(appliance, prep);

  // Sugestão de sincronização com o plano da maxila (segmentação)
  const maxilla = (protocol.surgicalPlan as any)?.maxilla;
  const planHasSegmentation =
    maxilla?.osteotomyType === "segmented" ||
    (maxilla?.segments?.length ?? 0) > 1 ||
    !!(protocol.surgicalPlan as any)?.maxillaComplement?.segmentationParts;
  const suggestSync = planHasSegmentation && ctx.segmentation !== "yes";

  const { deadline, manual } = computeActivationDeadline(
    protocol.surgeryDate,
    ctx.appliance,
    prep,
  );
  const dlState = deadlineState(deadline, !!prep.lastActivationDone);

  const getItem = (key: string): PrepItem | undefined => prep.items?.find((i) => i.key === key);
  const setItem = (key: string, patch: Partial<PrepItem>) => {
    // Compor sempre a partir do snapshot mais recente (ref), não do render.
    const base = prepRef.current;
    const items = [...(base.items || [])];
    const idx = items.findIndex((i) => i.key === key);
    if (idx >= 0) items[idx] = { ...items[idx], ...patch };
    else items.push({ key, status: "todo", ...patch } as PrepItem);
    persist({ ...prepRef.current, items });
  };

  const getProduct = (key: string): PrepProduct | undefined =>
    prep.products?.find((p) => p.key === key);
  const setProduct = (key: string, status: string) => {
    const products = [...(prepRef.current.products || [])];
    const idx = products.findIndex((p) => p.key === key);
    const next = { key, status, updatedAt: new Date().toISOString() } as PrepProduct;
    if (idx >= 0) products[idx] = { ...products[idx], ...next };
    else products.push(next);
    persist({ ...prepRef.current, products });
  };

  const getAlert = (key: string): PrepAlert | undefined => prep.alerts?.find((a) => a.key === key);
  const setAlertResolved = (key: string, resolved: boolean) => {
    const alerts = [...(prepRef.current.alerts || [])];
    const idx = alerts.findIndex((a) => a.key === key);
    const next: PrepAlert = {
      key,
      resolved,
      resolvedAt: resolved ? new Date().toISOString() : undefined,
    };
    if (idx >= 0) alerts[idx] = next;
    else alerts.push(next);
    persist({ ...prepRef.current, alerts });
  };

  const setDecision = (field: string, value: string) => {
    persist({ ...prepRef.current, decisions: { ...(prepRef.current.decisions || {}), [field]: value } as any });
  };

  const activeAlerts = PREP_ALERTS.filter((a) => a.activeWhen(ctx));

  const deadlineClasses =
    dlState === "overdue"
      ? "border-red-400 bg-red-50 text-red-900"
      : dlState === "near"
        ? "border-amber-400 bg-amber-50 text-amber-900"
        : "border-border bg-muted/20 text-foreground";

  return (
    <div className="flex-1 overflow-auto bg-muted/20 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/protocols/${protocolId}`}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Protocolo
                </Link>
              </Button>
              {updateMutation.isPending && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> A gravar…
                </span>
              )}
            </div>
            <h1 className="text-2xl font-light tracking-tight mt-1">
              Preparação — {protocol.patientName}
            </h1>
            <p className="text-muted-foreground text-xs uppercase tracking-widest mt-1">
              Processo {protocol.processNumber}
              {protocol.surgeryDate && ` · Cirurgia: ${protocol.surgeryDate.slice(0, 10)}`}
            </p>
          </div>
          <Badge variant="outline" className="uppercase text-[10px] tracking-wider">
            Fase 1 · Preparação
          </Badge>
        </div>

        {isFinalized && (
          <div className="border border-amber-300 bg-amber-50 text-amber-900 rounded-sm p-3 text-sm">
            Protocolo finalizado — a preparação está em modo de leitura.
          </div>
        )}

        {/* Alertas condicionais */}
        {activeAlerts.map((a) => {
          const stored = getAlert(a.key);
          const resolved = !!stored?.resolved;
          return (
            <div
              key={a.key}
              className={`flex items-start justify-between gap-4 border-2 rounded-sm p-4 ${
                resolved
                  ? "border-border bg-muted/20 text-muted-foreground"
                  : "border-red-400 bg-red-50 text-red-900"
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className={`h-5 w-5 shrink-0 ${resolved ? "" : "text-red-600"}`} />
                <div>
                  <p className="font-semibold text-sm">{a.label}</p>
                  {resolved && stored?.resolvedAt && (
                    <p className="text-xs mt-0.5">
                      Resolvido em {new Date(stored.resolvedAt).toLocaleDateString("pt-PT")}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant={resolved ? "ghost" : "destructive"}
                size="sm"
                disabled={isFinalized}
                className="uppercase tracking-wider text-xs shrink-0"
                onClick={() => setAlertResolved(a.key, !resolved)}
              >
                {resolved ? "Reabrir" : "Marcar resolvido"}
              </Button>
            </div>
          );
        })}

        {/* Dados gerais */}
        <Card className="shadow-xs border-border/50">
          <CardHeader>
            <CardTitle className="uppercase tracking-widest text-sm text-primary">
              Dados da Preparação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Data da preparação
                </Label>
                <Input
                  type="date"
                  value={prep.preparationDate?.slice(0, 10) || ""}
                  onChange={(e) => persist({ ...prepRef.current, preparationDate: e.target.value })}
                  disabled={isFinalized}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Responsável pela recolha
                </Label>
                <Input
                  value={prep.dataCollector || ""}
                  onChange={(e) => persist({ ...prepRef.current, dataCollector: e.target.value })}
                  disabled={isFinalized}
                  placeholder="Nome"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Ortodontista
                </Label>
                <Input
                  value={prep.orthodontistName || ""}
                  onChange={(e) => persist({ ...prepRef.current, orthodontistName: e.target.value })}
                  disabled={isFinalized}
                  placeholder="Nome"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Aparelho ortodôntico
                </Label>
                <Select
                  disabled={isFinalized}
                  value={appliance || ""}
                  onValueChange={(val) => persist(prep, val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(APPLIANCE_LABELS) as Appliance[]).map((k) => (
                      <SelectItem key={k} value={k}>{APPLIANCE_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Segmentação
                </Label>
                <Select
                  disabled={isFinalized}
                  value={ctx.segmentation}
                  onValueChange={(val) => persist({ ...prepRef.current, segmentation: val as Segmentation })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SEGMENTATION_LABELS) as Segmentation[]).map((k) => (
                      <SelectItem key={k} value={k}>{SEGMENTATION_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {suggestSync && (
                  <div className="flex items-center justify-between gap-2 border border-blue-300 bg-blue-50 text-blue-900 rounded-sm p-2 text-xs">
                    <span>O plano da maxila indica segmentação — sincronizar?</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={isFinalized}
                      onClick={() => persist({ ...prepRef.current, segmentation: "yes" })}
                    >
                      Sim
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Data-limite da última ativação */}
            <div className={`border-2 rounded-sm p-4 space-y-3 ${deadlineClasses}`}>
              <div className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5" />
                <span className="text-xs uppercase tracking-widest font-bold">
                  Data-limite da última ativação
                </span>
                {manual && (
                  <Badge variant="outline" className="text-[10px] uppercase">Ajustada manualmente</Badge>
                )}
                {dlState === "overdue" && (
                  <Badge variant="destructive" className="text-[10px] uppercase">Ultrapassada</Badge>
                )}
                {dlState === "near" && (
                  <Badge className="bg-amber-500 text-white text-[10px] uppercase">Próxima (≤ 7 dias)</Badge>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Data-limite</Label>
                  <Input
                    type="date"
                    className="bg-white"
                    value={deadline || ""}
                    disabled={isFinalized}
                    onChange={(e) =>
                      persist({
                        ...prepRef.current,
                        activationDeadline: e.target.value,
                        activationDeadlineManual: true,
                      })
                    }
                  />
                </div>
                {manual && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isFinalized}
                    className="text-xs"
                    onClick={() =>
                      persist({
                        ...prepRef.current,
                        activationDeadline: undefined,
                        activationDeadlineManual: false,
                      })
                    }
                  >
                    Repor cálculo automático
                  </Button>
                )}
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!!prep.lastActivationDone}
                    disabled={isFinalized}
                    onCheckedChange={(v) => persist({ ...prepRef.current, lastActivationDone: v })}
                  />
                  <Label className="text-sm">Última ativação concluída</Label>
                </div>
              </div>
              <p className="text-xs opacity-80">
                Regra: 3 semanas antes da cirurgia (BRK) / 2 semanas (Aligners). Ajustável caso a caso.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Decisões técnicas */}
        <Card className="shadow-xs border-border/50">
          <CardHeader>
            <CardTitle className="uppercase tracking-widest text-sm text-primary">
              Decisões Técnicas
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Oclusão final planeada
              </Label>
              <Select
                disabled={isFinalized}
                value={prep.decisions?.occlusion || "undecided"}
                onValueChange={(v) => setDecision("occlusion", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="odc">ODC — oclusão dentária completa</SelectItem>
                  <SelectItem value="omc">OMC — oclusão máxima de conveniência</SelectItem>
                  <SelectItem value="undecided">Por decidir</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Guias cirúrgicas
              </Label>
              <Select
                disabled={isFinalized}
                value={prep.decisions?.guides || "undecided"}
                onValueChange={(v) => setDecision("guides", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="guides">Com guias</SelectItem>
                  <SelectItem value="splintless">Splintless</SelectItem>
                  <SelectItem value="undecided">Por decidir</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {ctx.appliance === "brk" && prep.decisions?.occlusion === "omc" && (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Piggyback
                </Label>
                <Select
                  disabled={isFinalized}
                  value={prep.decisions?.piggyback || ""}
                  onValueChange={(v) => setDecision("piggyback", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Sim</SelectItem>
                    <SelectItem value="no">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {ctx.appliance === "aligners" && (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Alinhadores passivos
                </Label>
                <Select
                  disabled={isFinalized}
                  value={prep.decisions?.passiveAligners || ""}
                  onValueChange={(v) => setDecision("passiveAligners", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Sim</SelectItem>
                    <SelectItem value="no">Não</SelectItem>
                    <SelectItem value="to_fabricate">A fabricar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Checklist em blocos */}
        {PREP_BLOCKS.map((block) => (
          <Card key={block.key} className="shadow-xs border-border/50">
            <CardHeader>
              <CardTitle className="uppercase tracking-widest text-sm text-primary">
                {block.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {block.items.map((def) => {
                const stored = getItem(def.key);
                const status = effectiveItemStatus(def, ctx, stored);
                const applicable = isItemApplicable(def, ctx);
                const dimmed = status === "na_auto";
                return (
                  <div
                    key={def.key}
                    className={`p-3 rounded-sm border bg-muted/5 space-y-2 ${dimmed ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <span className="font-medium text-sm">{def.label}</span>
                        {def.note && (
                          <span className="text-xs text-muted-foreground ml-2">({def.note})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {dimmed ? (
                          <>
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {ITEM_STATUS_LABELS.na_auto}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              disabled={isFinalized}
                              onClick={() => setItem(def.key, { status: "todo" })}
                            >
                              Ativar
                            </Button>
                          </>
                        ) : (
                          <div className="flex bg-muted p-1 rounded-sm">
                            {ITEM_STATUS_CYCLE.map((s) => (
                              <Button
                                key={s}
                                type="button"
                                variant={status === s ? (s === "done" ? "default" : s === "na" ? "secondary" : "destructive") : "ghost"}
                                size="sm"
                                className={`px-3 py-1 h-8 rounded-sm text-xs uppercase tracking-wider ${status === s && s === "done" ? "bg-teal-600 hover:bg-teal-700" : ""}`}
                                disabled={isFinalized}
                                onClick={() => setItem(def.key, { status: s })}
                              >
                                {ITEM_STATUS_LABELS[s]}
                              </Button>
                            ))}
                            {!applicable && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="px-3 py-1 h-8 rounded-sm text-xs uppercase tracking-wider"
                                disabled={isFinalized}
                                onClick={() => setItem(def.key, { status: "na_auto" })}
                              >
                                Repor N/A
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {def.hasDetail && !dimmed && (
                      <Input
                        className="text-sm"
                        placeholder="Especificar (ex.: tipo de aparelho auxiliar)…"
                        value={stored?.detail || ""}
                        disabled={isFinalized}
                        onChange={(e) => setItem(def.key, { detail: e.target.value })}
                      />
                    )}
                    {def.key === "doc.instrucoes" && (
                      <div className="flex items-center gap-4 border border-border/50 rounded-sm p-3 bg-white">
                        <QRCodeSVG value={INSTRUCTIONS_APP_URL} size={72} />
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Instruções pré e pós-operatórias online — mostrar/enviar ao doente:
                          </p>
                          <a
                            href={INSTRUCTIONS_APP_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-primary underline flex items-center gap-1"
                          >
                            {INSTRUCTIONS_APP_URL.replace("https://", "")}
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="space-y-1 pt-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Notas — {block.title}
                </Label>
                <Textarea
                  rows={2}
                  className="resize-none"
                  value={prep.blockNotes?.[block.key] || ""}
                  disabled={isFinalized}
                  onChange={(e) =>
                    persist({
                      ...prepRef.current,
                      blockNotes: { ...(prepRef.current.blockNotes || {}), [block.key]: e.target.value },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Produtos a fabricar */}
        <Card className="shadow-xs border-border/50">
          <CardHeader>
            <CardTitle className="uppercase tracking-widest text-sm text-primary">
              Produtos a Fabricar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {PREP_PRODUCTS.map((def) => {
              const stored = getProduct(def.key);
              const status = effectiveProductStatus(def, ctx, stored);
              const applicable = isProductApplicable(def, ctx);
              const dimmed = status === "na_auto";
              return (
                <div
                  key={def.key}
                  className={`flex items-center justify-between gap-3 flex-wrap p-3 rounded-sm border bg-muted/5 ${dimmed ? "opacity-50" : ""}`}
                >
                  <div>
                    <span className="font-medium text-sm">{def.label}</span>
                    {stored?.updatedAt && !dimmed && (
                      <p className="text-xs text-muted-foreground">
                        Atualizado: {new Date(stored.updatedAt).toLocaleDateString("pt-PT")}
                      </p>
                    )}
                  </div>
                  {dimmed ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {PRODUCT_STATUS_LABELS.na_auto}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={isFinalized}
                        onClick={() => setProduct(def.key, "todo")}
                      >
                        Ativar
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex bg-muted p-1 rounded-sm">
                        {PRODUCT_STATUS_ORDER.map((s) => (
                          <Button
                            key={s}
                            type="button"
                            variant={status === s ? "default" : "ghost"}
                            size="sm"
                            className={`px-3 py-1 h-8 rounded-sm text-xs uppercase tracking-wider ${status === s && s === "verified" ? "bg-teal-600 hover:bg-teal-700" : ""}`}
                            disabled={isFinalized}
                            onClick={() => setProduct(def.key, s)}
                          >
                            {s === "verified" && <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                            {PRODUCT_STATUS_LABELS[s]}
                          </Button>
                        ))}
                      </div>
                      {!applicable && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={isFinalized}
                          onClick={() => setProduct(def.key, "na_auto")}
                        >
                          Repor N/A
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Histórico — checklist anterior */}
        {!!prep.legacyChecklist?.length && (
          <Card className="shadow-xs border-border/50">
            <CardHeader>
              <CardTitle className="uppercase tracking-widest text-sm text-muted-foreground flex items-center gap-2">
                <History className="h-4 w-4" /> Histórico — checklist anterior
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {prep.legacyChecklist.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-sm border bg-muted/10 text-sm text-muted-foreground"
                >
                  <span>{item.item}</span>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {item.status === "ok" ? "OK" : item.status === "na" ? "N/A" : "Faltava"}
                  </Badge>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-1">
                Registos da checklist genérica anterior, preservados apenas para consulta.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
