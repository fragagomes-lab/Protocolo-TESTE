import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  FileText, 
  Files, 
  MessageSquareQuote,
  PlusCircle,
  BookOpen
} from "lucide-react";
import logo from "@assets/clinicadaface-logo.svg";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Protocolos", href: "/protocols", icon: FileText },
  { name: "Templates", href: "/templates", icon: Files },
  { name: "Frases Clínicas", href: "/phrases", icon: MessageSquareQuote },
  { name: "Informação Clínica", href: "/info", icon: BookOpen },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Barra superior — apenas em telemóvel/tablet pequeno */}
      {/* Sem logotipo aqui — em ecrã pequeno basta o logotipo grande do Dashboard */}
      <div className="md:hidden bg-sidebar border-b border-sidebar-border sticky top-0 z-20 print:hidden">
        <nav className="flex items-center overflow-x-auto px-2 py-1.5 gap-1">
          {navigation.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-xs font-medium rounded-sm whitespace-nowrap",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80",
                )}
              >
                <item.icon className="mr-1.5 h-4 w-4" aria-hidden="true" />
                {item.name}
              </Link>
            );
          })}
          <Link
            href="/protocols/new"
            className="ml-auto flex items-center px-3 py-1.5 text-xs font-medium text-primary bg-white rounded-sm uppercase tracking-wider whitespace-nowrap"
          >
            <PlusCircle className="mr-1.5 h-4 w-4" /> Novo
          </Link>
        </nav>
      </div>

      {/* Sidebar */}
      <div className="w-64 bg-sidebar border-r border-sidebar-border flex-col hidden md:flex flex-shrink-0">
        <div className="flex flex-col justify-center px-6 py-4 border-b border-sidebar-border bg-sidebar-accent">
          <img src={logo} alt="Clínica da Face" className="h-24 w-full object-contain object-left" style={{ filter: 'brightness(0) invert(1)' }} />
          <div className="mt-3 space-y-0.5 text-white/[0.76] leading-tight">
            <p className="text-[11px] font-medium tracking-wide">Cirurgia Ortognática</p>
            <p className="text-[10px] tracking-wide">
              Dr. António Matos da Fonseca
              <span className="block text-white/60">Médico – Cirurgia Maxilo-Facial</span>
            </p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6">
          <nav className="space-y-1 px-4">
            {navigation.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-3 py-2.5 text-sm font-medium rounded-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 flex-shrink-0 h-5 w-5",
                      isActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-sidebar-border">
          <Link
            href="/protocols/new"
            className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-primary bg-white rounded-sm hover:bg-white/90 transition-colors uppercase tracking-wider"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Protocolo
          </Link>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {children}
      </main>
    </div>
  );
}
