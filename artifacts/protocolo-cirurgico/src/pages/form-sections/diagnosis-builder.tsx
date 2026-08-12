import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useListPhrases, useSuggestDiagnosisAi, PreopDiagnosis, DiagnosisAiSuggestion } from "@workspace/api-client-react";
import { ListChecks, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DiagnosisBuilderProps {
  protocolId: number | null;
  diagnosis: PreopDiagnosis;
  updateDiagnosis: (diagnosis: PreopDiagnosis) => void;
  patientAge?: number | null;
  isFinalized: boolean;
}

// Ordem fixa das subcategorias no construtor (as frases vêm da biblioteca de
// Frases Clínicas, categoria "Diagnóstico" — editáveis na página Frases).
const SUBCATEGORY_ORDER = [
  "Esquelético / sagital",
  "Vertical / planos oclusais",
  "Assimetrias",
  "Transversal / dentário",
  "ATM / função",
  "Vias aéreas / nasal",
];

export function DiagnosisBuilder({ protocolId, diagnosis, updateDiagnosis, patientAge, isFinalized }: DiagnosisBuilderProps) {
  const { data: phrases } = useListPhrases();
  const [intro, setIntro] = useState<string>("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [closings, setClosings] = useState<Set<number>>(new Set());
  const [aiNotes, setAiNotes] = useState<string | null>(null);
  const suggestMutation = useSuggestDiagnosisAi();

  const diag = useMemo(
    () => (phrases ?? []).filter((p) => p.category === "Diagnóstico"),
    [phrases],
  );
  const intros = diag.filter((p) => p.subcategory === "Introdução");
  const closingPhrases = diag.filter((p) => p.subcategory === "Fecho");
  const groups = useMemo(() => {
    const known = new Set<string>(["Introdução", "Fecho", ...SUBCATEGORY_ORDER]);
    const extra = [...new Set(diag.map((p) => p.subcategory || "Outros"))].filter((s) => !known.has(s));
    return [...SUBCATEGORY_ORDER, ...extra]
      .map((sub) => ({ sub, items: diag.filter((p) => (p.subcategory || "Outros") === sub) }))
      .filter((g) => g.items.length > 0);
  }, [diag]);

  const toggle = (set: Set<number>, id: number) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  };

  const fillAge = (text: string) =>
    patientAge != null ? text.replace("[X]", String(patientAge)) : text;

  const applySuggestion = (s: DiagnosisAiSuggestion) => {
    const validIds = new Set(diag.map((p) => p.id));
    const introPhrase = s.introPhraseId != null ? intros.find((p) => p.id === s.introPhraseId) : undefined;
    if (introPhrase) setIntro(introPhrase.text);
    setSelected(new Set((s.phraseIds ?? []).filter((pid) => validIds.has(pid))));
    setAiNotes(s.notes || null);
    toast.success("Sugestão da IA aplicada às caixas — reveja, ajuste e só depois gere o texto.");
  };

  const runSuggest = (force = false) => {
    if (!protocolId) return;
    suggestMutation.mutate(
      { id: protocolId, data: { force } },
      {
        onSuccess: (s) => applySuggestion(s),
        onError: (err: unknown) => {
          const e = err as { response?: { status?: number; data?: { message?: string } } };
          if (e.response?.status === 409) {
            if (window.confirm("Já existe uma sugestão de IA para este doente. Repetir a análise (tem custos)? A anterior fica arquivada.")) {
              runSuggest(true);
            }
          } else {
            toast.error(e.response?.data?.message || "Erro na análise de IA.");
          }
        },
      },
    );
  };

  const generate = () => {
    const parts: string[] = [];
    if (intro) parts.push(fillAge(intro));
    const body = diag.filter((p) => selected.has(p.id)).map((p) => `• ${p.text}`);
    if (body.length > 0) parts.push(body.join("\n"));
    const close = closingPhrases.filter((p) => closings.has(p.id)).map((p) => p.text);
    if (close.length > 0) parts.push(close.join("\n\n"));
    if (parts.length === 0) {
      toast.error("Escolha uma introdução e/ou frases de diagnóstico primeiro.");
      return;
    }
    updateDiagnosis({ ...diagnosis, diagnosisNarrative: parts.join("\n\n") });
    toast.success("Texto de diagnóstico gerado — pode editá-lo livremente abaixo.");
  };

  return (
    <Card className="shadow-xs border-border/50">
      <CardHeader>
        <CardTitle className="uppercase tracking-widest text-sm text-primary flex items-center gap-2">
          <ListChecks className="h-4 w-4" /> Construtor de Diagnóstico
        </CardTitle>
        <CardDescription>
          Escolha a introdução e marque as frases aplicáveis. O texto gerado é editável e alimenta as
          Notas de Alta e o Relatório Clínico. As frases gerem-se na página Frases Clínicas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-3 border border-dashed border-primary/40 rounded-sm p-3 bg-primary/5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="uppercase tracking-wider text-xs"
            disabled={isFinalized || !protocolId || suggestMutation.isPending}
            onClick={() => runSuggest(false)}
          >
            {suggestMutation.isPending
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> A analisar fotos…</>
              : <><Sparkles className="mr-2 h-4 w-4" /> Sugerir com IA (fotos iniciais)</>}
          </Button>
          <span className="text-xs text-muted-foreground leading-snug flex-1 min-w-[200px]">
            A IA analisa as fotografias clínicas iniciais (passo 2) e pré-seleciona frases como sugestão.
            Nada é aplicado sem a sua revisão{!protocolId ? " — grave primeiro o protocolo" : ""}.
          </span>
        </div>
        {aiNotes && (
          <div className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-3 whitespace-pre-wrap">
            <span className="font-semibold uppercase tracking-wider">Notas da IA: </span>{aiNotes}
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Frase de introdução</Label>
          <Select disabled={isFinalized} value={intro} onValueChange={setIntro}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a introdução..." />
            </SelectTrigger>
            <SelectContent>
              {intros.map((p) => (
                <SelectItem key={p.id} value={p.text}>{fillAge(p.text)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {groups.map(({ sub, items }) => (
            <div key={sub} className="space-y-2">
              <div className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground border-b pb-1">{sub}</div>
              {items.map((p) => (
                <label key={p.id} className="flex items-start gap-2 text-sm cursor-pointer">
                  <Checkbox
                    disabled={isFinalized}
                    checked={selected.has(p.id)}
                    onCheckedChange={() => setSelected((s) => toggle(s, p.id))}
                    className="mt-0.5"
                  />
                  <span className="leading-snug">{p.text}</span>
                </label>
              ))}
            </div>
          ))}
        </div>

        {closingPhrases.length > 0 && (
          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground border-b pb-1">Fecho</div>
            {closingPhrases.map((p) => (
              <label key={p.id} className="flex items-start gap-2 text-sm cursor-pointer">
                <Checkbox
                  disabled={isFinalized}
                  checked={closings.has(p.id)}
                  onCheckedChange={() => setClosings((s) => toggle(s, p.id))}
                  className="mt-0.5"
                />
                <span className="leading-snug">{p.text}</span>
              </label>
            ))}
          </div>
        )}

        <Button type="button" onClick={generate} disabled={isFinalized} className="uppercase tracking-wider text-xs">
          Gerar texto de diagnóstico
        </Button>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Texto de diagnóstico (editável)
          </Label>
          <Textarea
            value={diagnosis.diagnosisNarrative || ""}
            onChange={(e) => updateDiagnosis({ ...diagnosis, diagnosisNarrative: e.target.value })}
            disabled={isFinalized}
            rows={8}
            placeholder="Gere o texto acima ou escreva diretamente. Este texto aparece nas Notas de Alta e no Relatório Clínico."
          />
        </div>
      </CardContent>
    </Card>
  );
}
