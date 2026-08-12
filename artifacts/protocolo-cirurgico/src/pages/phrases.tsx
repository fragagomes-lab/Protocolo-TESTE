import { useListPhrases, useCreatePhrase, useUpdatePhrase, useDeletePhrase, getListPhrasesQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
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

const phraseSchema = z.object({
  category: z.string().min(1, "Categoria é obrigatória"),
  subcategory: z.string().optional(),
  text: z.string().min(1, "Texto é obrigatório"),
  isCustom: z.boolean().default(true),
});

type PhraseFormValues = z.infer<typeof phraseSchema>;

export function PhrasesList() {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
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

  // Group phrases by category for better display
  const groupedPhrases = phrases?.reduce((acc, phrase) => {
    if (!acc[phrase.category]) acc[phrase.category] = [];
    acc[phrase.category].push(phrase);
    return acc;
  }, {} as Record<string, Phrase[]>) || {};

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

      <div className="px-8 py-4 border-b flex items-center gap-4 bg-muted/10 shrink-0">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[280px] bg-white">
            <SelectValue placeholder="Todas as Categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Categorias</SelectItem>
            {categories.map(c => (
              <SelectItem key={c} value={c}>{categoryLabels[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-8 bg-muted/5">
        <div className="max-w-5xl mx-auto space-y-8">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-48 mb-4" />
              {Array(3).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : Object.keys(groupedPhrases).length === 0 ? (
            <div className="bg-white p-12 text-center text-muted-foreground border rounded-sm border-dashed">
              Nenhuma frase encontrada para esta categoria.
            </div>
          ) : (
            Object.entries(groupedPhrases).map(([category, categoryPhrases]) => (
              <div key={category} className="space-y-4">
                <h2 className="text-lg font-medium text-primary uppercase tracking-widest border-b pb-2">
                  {categoryLabels[category] || category}
                </h2>
                <div className="grid gap-4">
                  {categoryPhrases.map(phrase => (
                    <div key={phrase.id} className="bg-white border rounded-sm p-4 flex gap-4 hover:border-primary/50 transition-colors group">
                      <div className="flex-1 space-y-1">
                        {phrase.subcategory && (
                          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                            {phrase.subcategory}
                          </div>
                        )}
                        <p className="text-sm text-foreground/90 leading-relaxed">{phrase.text}</p>
                      </div>
                      <div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
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
              </div>
            ))
          )}
        </div>
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
