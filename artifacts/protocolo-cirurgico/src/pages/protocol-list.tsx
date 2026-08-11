import { useListProtocols, useDuplicateProtocol, useDeleteProtocol, getListProtocolsQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Search, 
  PlusCircle, 
  MoreVertical, 
  Copy, 
  Trash2, 
  FileText, 
  Printer
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isFinalizedLockError, finalizedLockMessage } from "@/lib/finalized-error";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ProtocolSummaryStatus } from "@workspace/api-client-react";

export function ProtocolList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: protocols, isLoading } = useListProtocols({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const duplicateMutation = useDuplicateProtocol();
  const deleteMutation = useDeleteProtocol();

  const handleDuplicate = async (id: number) => {
    try {
      await duplicateMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListProtocolsQueryKey() });
      toast.success("Protocolo duplicado com sucesso");
    } catch (e) {
      toast.error("Erro ao duplicar protocolo");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este protocolo?")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListProtocolsQueryKey() });
      toast.success("Protocolo excluído com sucesso");
    } catch (e) {
      if (isFinalizedLockError(e)) {
        toast.error(finalizedLockMessage(e), {
          description: "Reabra o protocolo antes de o eliminar.",
        });
        queryClient.invalidateQueries({ queryKey: getListProtocolsQueryKey() });
        return;
      }
      toast.error("Erro ao excluir protocolo");
    }
  };

  const getStatusBadge = (status: ProtocolSummaryStatus) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline" className="bg-muted text-muted-foreground uppercase text-[10px] tracking-wider">Rascunho</Badge>;
      case "preop_complete":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 uppercase text-[10px] tracking-wider">Pré-op</Badge>;
      case "intraop_complete":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 uppercase text-[10px] tracking-wider">Intra-op</Badge>;
      case "finalized":
        return <Badge variant="default" className="uppercase text-[10px] tracking-wider">Finalizado</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      <div className="border-b px-8 py-6 flex items-center justify-between shrink-0 bg-white">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-foreground">Protocolos</h1>
          <p className="text-muted-foreground mt-1 text-sm">Gerencie os protocolos operatórios</p>
        </div>
        <Button asChild className="uppercase tracking-widest">
          <Link href="/protocols/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Protocolo
          </Link>
        </Button>
      </div>

      <div className="px-8 py-4 border-b flex items-center gap-4 bg-muted/10 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por paciente ou processo..." 
            className="pl-9 bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue placeholder="Todos os Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="draft">Rascunho</SelectItem>
            <SelectItem value="preop_complete">Pré-op Concluído</SelectItem>
            <SelectItem value="intraop_complete">Intra-op Concluído</SelectItem>
            <SelectItem value="finalized">Finalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-auto p-8 bg-muted/5">
        <div className="bg-white border rounded-sm shadow-xs overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium tracking-wider">Processo</th>
                <th className="px-6 py-4 font-medium tracking-wider">Paciente</th>
                <th className="px-6 py-4 font-medium tracking-wider">Cirurgia</th>
                <th className="px-6 py-4 font-medium tracking-wider">Data</th>
                <th className="px-6 py-4 font-medium tracking-wider">Status</th>
                <th className="px-6 py-4 font-medium tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-8 w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : protocols?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    Nenhum protocolo encontrado.
                  </td>
                </tr>
              ) : (
                protocols?.map((protocol) => (
                  <tr key={protocol.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        {protocol.processNumber}
                        {protocol.processNumber?.startsWith("DEMO-") && (
                          <Badge variant="destructive" className="uppercase text-[10px] tracking-wider">Demonstração</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{protocol.patientName}</div>
                      {protocol.surgeon && <div className="text-xs text-muted-foreground">Cirurgião: {protocol.surgeon}</div>}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{protocol.surgeryType}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {protocol.surgeryDate ? format(new Date(protocol.surgeryDate), "dd/MM/yyyy") : "-"}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(protocol.status)}
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
                          <DropdownMenuItem onClick={() => setLocation(`/protocols/${protocol.id}`)}>
                            <FileText className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setLocation(`/protocols/${protocol.id}/print`)}>
                            <Printer className="mr-2 h-4 w-4" /> Imprimir
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDuplicate(protocol.id)}>
                            <Copy className="mr-2 h-4 w-4" /> Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                            onClick={() => handleDelete(protocol.id)}
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
    </div>
  );
}
