import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import { Layout } from '@/components/layout';
import { Dashboard } from '@/pages/dashboard';
import { ProtocolList } from '@/pages/protocol-list';
import { ProtocolForm } from '@/pages/protocol-form';
import { ProtocolPreparation } from '@/pages/protocol-preparation';
import { ProtocolPrint } from '@/pages/protocol-print';
import { TemplatesList } from '@/pages/templates';
import { PhrasesList } from '@/pages/phrases';
import { OrthoInfo } from '@/pages/ortho-info';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/protocols/:id/print" component={ProtocolPrint} />
      
      <Route path="*">
        <Layout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/protocols" component={ProtocolList} />
            <Route path="/protocols/new" component={ProtocolForm} />
            <Route path="/protocols/:id/preparation" component={ProtocolPreparation} />
            <Route path="/protocols/:id" component={ProtocolForm} />
            <Route path="/templates" component={TemplatesList} />
            <Route path="/phrases" component={PhrasesList} />
            <Route path="/info" component={OrthoInfo} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
