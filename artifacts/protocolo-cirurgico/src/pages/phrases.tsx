import { useListPhrases, useCreatePhrase, useUpdatePhrase, useDeletePhrase, getListPhrasesQueryKey } from "@workspace/api-client-react";
import { useMemo, useState } from "react";
import { 
  PlusCircle, 
  MoreVertical, 
  FileEdit, 
  Trash2,
  Search
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Phrase } from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

const phraseSchema = z.object({
  category: z.string().min(1, "Categoria é obrigatória"),
  subcategory: z.string().optional(),
  text: z.string().min(1, "Texto é obrigatório"),
  isCustom: z.boolean().default(true),
});

type PhraseFormValues = z.infer<typeof phraseSchema>;

export function PhrasesList() {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const { data: phrases, isLoading } = useListPhrases({
    category: categoryFilter !== "all" ? categoryFilter : undefined
  });
  
  const queryClient = useQueryClient();
  const createMutation = useCreatePhrase();
  const updateMutation = useUpdatePhrase();
  const deleteMutation = useDeletePhrase();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPhrase, setEditingPhrase] = useState<Phrase | null>(null);

  const form = useForm<PhraseFormValues>({
    resolver: zodResolver(phraseSchema),
    defaultValues: {
      category: "",
      subcategory: "",
      text: "",
      isCustom: true,
    },
  });

  const categories = ["maxilla", "mandible", "chin", "associated", "complications", "general"];
  const categoryLabels: Record<string, string> = {
    maxilla: "Maxila",
    mandible: "Mandíbula",
    chin: "Mento",
    associated: "Procedimentos Associados",
    complications: "Complicações",
    general: "Geral"
  };

  const openNewDialog = () => {
    setEditingPhrase(null);
    form.reset({
      category: categoryFilter !== "all" ? categoryFilter : "maxilla",
      subcategory: "",
      text: "",
      isCustom: true,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (phrase: Phrase) => {
    setEditingPhrase(phrase);
    form.reset({
      category: phrase.category,
      subcategory: phrase.subcategory || "",
      text: phrase.text,
      isCustom: phrase.isCustom || true,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir esta frase?")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListPhrasesQueryKey() });
      toast.success("Frase excluída com sucesso");
    } catch (e) {
      toast.error("Erro ao excluir frase");
    }
  };

  const onSubmit = async (values: PhraseFormValues) => {
    try {
      if (editingPhrase) {
        await updateMutation.mutateAsync({ 
          id: editingPhrase.id, 
          data: {
            category: values.category,
            subcategory: values.subcategory,
            text: values.text,
          } 
        });
        toast.success("Frase atualizada com sucesso");
      } else {
        await createMutation.mutateAsync({ 
          data: {
            category: values.category,
            subcategory: values.subcategory,
            text: values.text,
            isCustom: true
          } 
        });
        toast.success("Frase criada com sucesso");
      }
      queryClient.invalidateQueries({ queryKey: getListPhrasesQueryKey() });
      setIsDialogOpen(false);
    } catch (e) {
      toast.error("Erro ao salvar frase");
    }
  };

  const NO_SUBCATEGORY = "__geral__";

  // Filtro de pesquisa (texto e subcategoria), aplicado sobre a lista já filtrada por categoria
  const filteredPhrases = useMemo(() => {
    const list = phrases ?? [];
    const term = searchTerm.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (p) =>
        p.text.toLowerCase().includes(term) ||
        (p.subcategory ?? "").toLowerCase().includes(term)
    );
  }, [phrases, searchTerm]);

  // Estrutura: categoria → subcategoria → frases
  const structured = useMemo(() => {
    const acc: Record<string, Record<string, Phrase[]>> = {};
    for (const phrase of filteredPhrases) {
      const cat = phrase.category;
      const sub = phrase.subcategory && phrase.subcategory.trim() ? phrase.subcategory : NO_SUBCATEGORY;
      if (!acc[cat]) acc[cat] = {};
      if (!acc[cat][sub]) acc[cat][sub] = [];
      acc[cat][sub].push(phrase);
    }
    return acc;
  }, [filteredPhrases]);

  // Ordem estável das categorias (conhecidas primeiro, depois quaisquer extra)
  const orderedCategories = useMemo(() => {
    const present = Object.keys(structured);
    const known = categories.filter((c) => present.includes(c));
    const extra = present.filter((c) => !categories.includes(c));
    return [...known, ...extra];
  }, [structured]);

  const totalPhrases = filteredPhrases.length;

  const scrollToCategory = (category: string) => {
    const el = document.getElementById(`phrase-cat-${category}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      <div className="border-b px-8 py-6 flex items-center justify-between shrink-0 bg-white">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-foreground">Biblioteca de Frases Clínicas</h1>
          <p className="text-muted-foreground mt-1 text-sm">Frases padrão para uso no descritivo operatório</p>
        </div>
        <Button onClick={openNewDialog} className="uppercase tracking-widest">
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova Frase
        </Button>
      </div>

      <div className="px-8 py-4 border-b flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-muted/10 shrink-0">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[260px] bg-white">
            <SelectValue placeholder="Todas as Categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Categorias</SelectItem>
            {categories.map(c => (
              <SelectItem key={c} value={c}>{categoryLabels[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar frases…"
            className="pl-9 bg-white rounded-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-muted/5">
        {isLoading ? (
          <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-4">
            <Skeleton className="h-8 w-48 mb-4" />
            {Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : orderedCategories.length === 0 ? (
          <div className="max-w-6xl mx-auto p-4 md:p-8">
            <div className="bg-white p-12 text-center text-muted-foreground border rounded-sm border-dashed">
              Nenhuma frase encontrada para os critérios selecionados.
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8 items-start">
            {/* Índice lateral navegável por tema */}
            <nav className="lg:sticky lg:top-4 w-full lg:w-56 shrink-0">
              <div className="bg-white border rounded-sm p-3">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold px-2 pb-2 mb-1 border-b">
                  Temas
                </p>
                <ul className="space-y-0.5">
                  {orderedCategories.map((category) => {
                    const count = Object.values(structured[category]).reduce((n, arr) => n + arr.length, 0);
                    return (
                      <li key={category}>
                        <button
                          type="button"
                          onClick={() => scrollToCategory(category)}
                          className="w-full flex items-center justify-between px-2 py-1.5 text-sm text-left rounded-sm text-foreground/80 hover:bg-primary/5 hover:text-primary transition-colors"
                        >
                          <span className="truncate">{categoryLabels[category] || category}</span>
                          <span className="ml-2 text-[11px] font-medium text-muted-foreground shrink-0">{count}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-[11px] text-muted-foreground px-2 pt-2 mt-1 border-t">
                  {totalPhrases} {totalPhrases === 1 ? "frase" : "frases"}
                </p>
              </div>
            </nav>

            {/* Secções por categoria com subcategorias em acordeão */}
            <div className="flex-1 min-w-0 space-y-8">
              {orderedCategories.map((category) => {
                const subMap = structured[category];
                const subKeys = Object.keys(subMap).sort((a, b) => {
                  if (a === NO_SUBCATEGORY) return -1;
                  if (b === NO_SUBCATEGORY) return 1;
                  return a.localeCompare(b, "pt");
                });
                return (
                  <section key={category} id={`phrase-cat-${category}`} className="scroll-mt-4 space-y-4">
                    <div className="flex items-baseline gap-3 border-b pb-2">
                      <h2 className="text-lg font-medium text-primary uppercase tracking-widest">
                        {categoryLabels[category] || category}
                      </h2>
                      <span className="text-xs text-muted-foreground">
                        {Object.values(subMap).reduce((n, arr) => n + arr.length, 0)}
                      </span>
                    </div>

                    <Accordion
                      type="multiple"
                      defaultValue={subKeys.map((s) => `${category}-${s}`)}
                      className="bg-white border rounded-sm divide-y"
                    >
                      {subKeys.map((sub) => {
                        const subPhrases = subMap[sub];
                        const isGeneral = sub === NO_SUBCATEGORY;
                        return (
                          <AccordionItem
                            key={`${category}-${sub}`}
                            value={`${category}-${sub}`}
                            className="border-b-0 px-4"
                          >
                            <AccordionTrigger className="hover:no-underline py-3">
                              <span className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    "text-xs uppercase tracking-wider font-semibold",
                                    isGeneral ? "text-muted-foreground" : "text-foreground"
                                  )}
                                >
                                  {isGeneral ? "Geral" : sub}
                                </span>
                                <span className="text-[11px] font-normal text-muted-foreground">
                                  {subPhrases.length}
                                </span>
                              </span>
                            </AccordionTrigger>
                            <AccordionContent className="pb-4">
                              <div className="grid gap-3">
                                {subPhrases.map((phrase) => (
                                  <div
                                    key={phrase.id}
                                    className="border rounded-sm p-3 flex gap-3 bg-muted/10 hover:border-primary/50 transition-colors group"
                                  >
                                    <p className="flex-1 text-sm text-foreground/90 leading-relaxed">
                                      {phrase.text}
                                    </p>
                                    <div className="shrink-0">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                          >
                                            <MoreVertical className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => openEditDialog(phrase)}>
                                            <FileEdit className="mr-2 h-4 w-4" /> Editar
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                            onClick={() => handleDelete(phrase.id)}
                                          >
                                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </section>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] border-none shadow-xl rounded-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-light uppercase tracking-widest text-primary">
              {editingPhrase ? "Editar Frase" : "Nova Frase"}
            </DialogTitle>
            <DialogDescription>
              Adicione uma frase que poderá ser inserida com um clique no descritivo operatório.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase text-xs tracking-wider text-muted-foreground font-semibold">Categoria</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-sm border-muted-foreground/30 focus-visible:ring-primary">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map(c => (
                            <SelectItem key={c} value={c}>{categoryLabels[c]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subcategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase text-xs tracking-wider text-muted-foreground font-semibold">Subcategoria (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Fixação" {...field} className="rounded-sm border-muted-foreground/30 focus-visible:ring-primary" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="uppercase text-xs tracking-wider text-muted-foreground font-semibold">Texto da Frase</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Insira o texto que irá compor o descritivo..." 
                        {...field} 
                        className="resize-y min-h-[120px] rounded-sm border-muted-foreground/30 focus-visible:ring-primary" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="uppercase tracking-widest rounded-sm">
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="uppercase tracking-widest rounded-sm">
                  Salvar Frase
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
