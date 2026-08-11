import { useListTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate, getListTemplatesQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { 
  PlusCircle, 
  MoreVertical, 
  FileEdit, 
  Trash2,
  Check
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
import { Badge } from "@/components/ui/badge";
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
import { Template } from "@workspace/api-client-react";
import { Checkbox } from "@/components/ui/checkbox";

const templateSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  surgeryType: z.string().min(1, "Tipo de cirurgia é obrigatório"),
  description: z.string().optional(),
  isDefault: z.boolean().default(false),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

export function TemplatesList() {
  const { data: templates, isLoading } = useListTemplates();
  const queryClient = useQueryClient();
  
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();
  const deleteMutation = useDeleteTemplate();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      surgeryType: "",
      description: "",
      isDefault: false,
    },
  });

  const openNewDialog = () => {
    setEditingTemplate(null);
    form.reset({
      name: "",
      surgeryType: "",
      description: "",
      isDefault: false,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (template: Template) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      surgeryType: template.surgeryType,
      description: template.description || "",
      isDefault: template.isDefault || false,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este template?")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
      toast.success("Template excluído com sucesso");
    } catch (e) {
      toast.error("Erro ao excluir template");
    }
  };

  const onSubmit = async (values: TemplateFormValues) => {
    try {
      if (editingTemplate) {
        await updateMutation.mutateAsync({ 
          id: editingTemplate.id, 
          data: {
            name: values.name,
            surgeryType: values.surgeryType,
            description: values.description,
            isDefault: values.isDefault
          } 
        });
        toast.success("Template atualizado com sucesso");
      } else {
        await createMutation.mutateAsync({ 
          data: {
            name: values.name,
            surgeryType: values.surgeryType,
            description: values.description,
            isDefault: values.isDefault
          } 
        });
        toast.success("Template criado com sucesso");
      }
      queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
      setIsDialogOpen(false);
    } catch (e) {
      toast.error("Erro ao salvar template");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      <div className="border-b px-8 py-6 flex items-center justify-between shrink-0 bg-white">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-foreground">Templates Cirúrgicos</h1>
          <p className="text-muted-foreground mt-1 text-sm">Padrões pré-configurados para protocolos</p>
        </div>
        <Button onClick={openNewDialog} className="uppercase tracking-widest">
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Template
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-8 bg-muted/5">
        <div className="bg-white border rounded-sm shadow-xs overflow-hidden max-w-5xl mx-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium tracking-wider">Nome</th>
                <th className="px-6 py-4 font-medium tracking-wider">Tipo de Cirurgia</th>
                <th className="px-6 py-4 font-medium tracking-wider">Descrição</th>
                <th className="px-6 py-4 font-medium tracking-wider w-32">Padrão</th>
                <th className="px-6 py-4 font-medium tracking-wider text-right w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-full" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-8" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-8 w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : templates?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    Nenhum template encontrado.
                  </td>
                </tr>
              ) : (
                templates?.map((template) => (
                  <tr key={template.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{template.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{template.surgeryType}</td>
                    <td className="px-6 py-4 text-muted-foreground line-clamp-1">{template.description || "-"}</td>
                    <td className="px-6 py-4">
                      {template.isDefault && (
                        <Badge variant="secondary" className="bg-teal-100 text-teal-800 uppercase text-[10px] tracking-wider">
                          <Check className="mr-1 h-3 w-3" /> Padrão
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[160px]">
                          <DropdownMenuItem onClick={() => openEditDialog(template)}>
                            <FileEdit className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                            onClick={() => handleDelete(template.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] border-none shadow-xl rounded-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-light uppercase tracking-widest text-primary">
              {editingTemplate ? "Editar Template" : "Novo Template"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados básicos do template. O plano cirúrgico pode ser editado posteriormente.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase text-xs tracking-wider text-muted-foreground font-semibold">Nome do Template</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Ortognática Bimxilar Padrão" {...field} className="rounded-sm border-muted-foreground/30 focus-visible:ring-primary" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="surgeryType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase text-xs tracking-wider text-muted-foreground font-semibold">Tipo de Cirurgia</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Cirurgia Ortognática Bimaxilar" {...field} className="rounded-sm border-muted-foreground/30 focus-visible:ring-primary" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="uppercase text-xs tracking-wider text-muted-foreground font-semibold">Descrição</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Breve descrição do uso deste template" {...field} className="resize-none rounded-sm border-muted-foreground/30 focus-visible:ring-primary" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-sm border border-muted-foreground/20 p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="rounded-sm"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-medium">
                        Tornar como Padrão
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Aplicar automaticamente este template para novas cirurgias deste tipo.
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="uppercase tracking-widest rounded-sm">
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="uppercase tracking-widest rounded-sm">
                  Salvar Template
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
