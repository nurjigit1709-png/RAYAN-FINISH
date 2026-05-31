import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import { useEffect } from "react";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import ArchivesPage from "@/pages/archives";
import FolderPage from "@/pages/folder";
import EmployeesPage from "@/pages/employees";
import LogsPage from "@/pages/logs";
import SettingsPage from "@/pages/settings";
import ProfilePage from "@/pages/profile";
import ChatPage from "@/pages/chat";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function ProtectedRoute({ component: Component, componentProps }: { component: React.ComponentType<any>; componentProps?: any }) {
  const { user, isLoading, token } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!token) setLocation("/login");
  }, [token]);

  if (!token) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <Component {...(componentProps || {})} />;
}

function Router() {
  const { token } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (token && location === "/login") setLocation("/dashboard");
    if (!token && location !== "/login") setLocation("/login");
  }, [token, location]);

  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/" component={() => <ProtectedRoute component={DashboardPage} />} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={DashboardPage} />} />
      <Route path="/archives" component={() => <ProtectedRoute component={ArchivesPage} />} />
      <Route path="/folders/:id">
        {(params) => <ProtectedRoute component={FolderPage} componentProps={{ id: params.id }} />}
      </Route>
      <Route path="/chat" component={() => <ProtectedRoute component={ChatPage} />} />
      <Route path="/employees" component={() => <ProtectedRoute component={EmployeesPage} />} />
      <Route path="/logs" component={() => <ProtectedRoute component={LogsPage} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={SettingsPage} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={ProfilePage} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <LanguageProvider>
            <AuthProvider>
              <Router />
            </AuthProvider>
          </LanguageProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
