import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useGenerateOperativeDescription, useListPhrases } from "@workspace/api-client-react";
import { ProtocolInput } from "@workspace/api-client-react";
import { Loader2, Wand2, MessageSquarePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface DescriptionSectionProps {
  protocolId: number | null;
  description: string;
  updateDescription: (desc: string) => void;
  notes: string;
  updateNotes: (notes: string) => void;
  isFinalized: boolean;
  formData: ProtocolInput;
}

export function DescriptionSection({ 
  protocolId, 
  description, 
  updateDescription, 
  notes, 
  updateNotes, 
  isFinalized,
  formData 
}: DescriptionSectionProps) {
  
  const generateMutation = useGenerateOperativeDescription();
  const { data: phrases } = useListPhrases();
  
  const handleGenerate = async () => {
    if (!protocolId) {
      toast.error("Salve o protocolo primeiro antes de gerar o descritivo.");
      return;
    }
    try {
      const res = await generateMutation.mutateAsync({ id: protocolId });
      updateDescription(res.description);
      toast.success("Descritivo gerado com sucesso.");
    } catch (e) {
      toast.error("Erro ao gerar descritivo.");
    }
  };

  const insertPhrase = (text: string) => {
    if (isFinalized) return;
    const separator = description.length > 0 && !description.endsWith('\n') ? '\n\n' : '';
    updateDescription(`${description}${separator}${text}`);
  };

  // Group phrases by their actual category (Portuguese labels come from the
  // database), preserving insertion order so related snippets stay together.
  const groupedPhrases = (phrases ?? []).reduce((acc, p) => {
    const key = p.category?.trim() || "Geral";
    (acc[key] ||= []).push(p);
    return acc;
  }, {} as Record<string, NonNullable<typeof phrases>>);

  return (
    <div className="grid grid-cols-[1fr_300px] gap-6 items-start">
      
      <div className="space-y-6">
        <Card className="shadow-xs border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="uppercase tracking-widest text-sm text-primary">Descritivo Operatório</CardTitle>
              <CardDescription>Registo detalhado da técnica cirúrgica</CardDescription>
            </div>
            <Button 
              onClick={handleGenerate} 
              disabled={isFinalized || !protocolId || generateMutation.isPending}
              variant="outline"
              size="sm"
              className="uppercase tracking-widest text-xs bg-sidebar/5 hover:bg-sidebar/10 text-sidebar border-sidebar/20"
            >
              {generateMutation.isPending ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Wand2 className="mr-2 h-3 w-3" />}
              Auto-Gerar Descritivo
            </Button>
          </CardHeader>
          <CardContent>
            <Textarea 
              value={description} 
              onChange={(e) => updateDescription(e.target.value)} 
              disabled={isFinalized}
              className="min-h-[400px] font-serif leading-relaxed text-sm resize-y"
              placeholder="Descreva a técnica cirúrgica, acessos, achados intra-operatórios, osteotomias e encerramento..."
            />
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/50">
          <CardHeader>
            <CardTitle className="uppercase tracking-widest text-sm text-primary">Instruções / Notas Pós-Operatórias</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea 
              value={notes} 
              onChange={(e) => updateNotes(e.target.value)} 
              disabled={isFinalized}
              className="min-h-[150px] font-serif text-sm"
              placeholder="Instruções para a enfermaria, medicação específica, cuidados com elásticos..."
            />
          </CardContent>
        </Card>
      </div>

      <div className="sticky top-6">
        <Card className="shadow-xs border-border/50 h-[calc(100vh-200px)] flex flex-col">
          <CardHeader className="py-4 border-b bg-muted/10 shrink-0">
            <CardTitle className="uppercase tracking-widest text-xs text-foreground flex items-center">
              <MessageSquarePlus className="mr-2 h-4 w-4" />
              Frases Clínicas
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {!phrases || phrases.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma frase disponível.</p>
              ) : (
                Object.entries(groupedPhrases).map(([category, catPhrases]) => (
                  <div key={category} className="space-y-2">
                    <h4 className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground border-b pb-1">
                      {category}
                    </h4>
                    <div className="space-y-2">
                      {catPhrases.map(phrase => (
                        <div 
                          key={phrase.id} 
                          onClick={() => insertPhrase(phrase.text)}
                          className="text-xs p-2 rounded-sm border bg-white hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors group"
                        >
                          {phrase.subcategory ? (
                            <span className="block text-[9px] uppercase tracking-wider text-primary/70 font-semibold mb-0.5">
                              {phrase.subcategory}
                            </span>
                          ) : null}
                          <p className="line-clamp-3 text-muted-foreground group-hover:text-foreground">{phrase.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>

    </div>
  );
}
