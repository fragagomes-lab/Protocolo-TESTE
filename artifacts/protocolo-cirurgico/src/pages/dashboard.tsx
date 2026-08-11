import { useGetProtocolStats, useGetRecentProtocols } from "@workspace/api-client-react";
import { Link } from "wouter";
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  Activity,
  PlusCircle,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ProtocolSummaryStatus } from "@workspace/api-client-react";

export function Dashboard() {
  const { data: stats, isLoading: isStatsLoading } = useGetProtocolStats();
  const { data: recent, isLoading: isRecentLoading } = useGetRecentProtocols();

  const getStatusBadge = (status: ProtocolSummaryStatus) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline" className="bg-muted text-muted-foreground uppercase text-[10px] tracking-wider">Rascunho</Badge>;
      case "preop_complete":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 uppercase text-[10px] tracking-wider">Pré-op Concluído</Badge>;
      case "intraop_complete":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 uppercase text-[10px] tracking-wider">Intra-op Concluído</Badge>;
      case "finalized":
        return <Badge variant="default" className="uppercase text-[10px] tracking-wider">Finalizado</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-muted/20 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light tracking-tight text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1 text-sm uppercase tracking-widest">Protocolo Cirúrgico Ortognático</p>
          </div>
          <Button asChild className="uppercase tracking-widest px-6" size="lg">
            <Link href="/protocols/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Protocolo
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-xs border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Total de Protocolos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-light">
                {isStatsLoading ? <Skeleton className="h-9 w-16" /> : stats?.total || 0}
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-xs border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Finalizados</CardTitle>
              <CheckCircle className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-light">
                {isStatsLoading ? <Skeleton className="h-9 w-16" /> : stats?.byStatus?.finalized || 0}
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-xs border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Em Preparação</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-light">
                {isStatsLoading ? <Skeleton className="h-9 w-16" /> : (stats?.byStatus?.draft || 0) + (stats?.byStatus?.preop_complete || 0)}
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-xs border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Cirurgia Hoje</CardTitle>
              <Activity className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-light">
                {isStatsLoading ? <Skeleton className="h-9 w-16" /> : "0"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Protocols */}
        <Card className="shadow-xs border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm uppercase tracking-widest text-foreground font-medium">Protocolos Recentes</CardTitle>
                <CardDescription>Últimos registros atualizados</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild className="uppercase tracking-widest text-xs">
                <Link href="/protocols">Ver Todos <ChevronRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isRecentLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : recent && recent.length > 0 ? (
              <div className="divide-y border border-border/50 rounded-sm">
                {recent.map((protocol) => (
                  <Link key={protocol.id} href={`/protocols/${protocol.id}`} className="block hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-foreground">{protocol.patientName}</span>
                          {getStatusBadge(protocol.status)}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Processo: {protocol.processNumber}</span>
                          <span>&bull;</span>
                          <span>{protocol.surgeryType}</span>
                          {protocol.surgeryDate && (
                            <>
                              <span>&bull;</span>
                              <span>Data Cirurgia: {format(new Date(protocol.surgeryDate), "dd 'de' MMMM, yyyy", { locale: ptBR })}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed rounded-sm">
                <p className="text-muted-foreground text-sm">Nenhum protocolo recente encontrado.</p>
              </div>
            )}
          </CardContent>
        </Card>
        
      </div>
    </div>
  );
}
