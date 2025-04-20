import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Profile from "@/pages/profile";
import Appointments from "@/pages/appointments";
import Messages from "@/pages/messages";
import ConsentForms from "@/pages/consent-forms";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

// Componente para rutas protegidas
function ProtectedRoute({ component: Component, ...rest }: { component: any, path: string }) {
  const { user, isAuthenticated, isLoading, refetchUser } = useAuth();
  
  // Verificar si hay sesión almacenada localmente
  const hasLocalSession = localStorage.getItem('sessionActive') === 'true' || 
                         localStorage.getItem('lastKnownUser') !== null;
  
  // Efecto para forzar la recarga de datos de usuario al ingresar a una ruta protegida
  useEffect(() => {    
    const checkAuthentication = async () => {
      if (refetchUser) {
        try {
          await refetchUser();
          console.log("Refetch de usuario completado en ruta protegida");
        } catch (err) {
          console.error("Error al verificar la autenticación:", err);
          // No redirigir aquí, para evitar ciclos de redirección
        }
      }
    };
    
    checkAuthentication();
    
    // Verificación periódica solo cuando está visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkAuthentication();
      }
    }, 30000); // Cada 30 segundos
    
    return () => clearInterval(interval);
  }, [refetchUser, rest.path]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Verificación más permisiva:
  // Si hay una sesión local guardada, permitimos el acceso aunque la verificación actual haya fallado
  // Esto evita los deslogeos inesperados cuando hay problemas de red o del servidor
  if (!isAuthenticated && !user && !hasLocalSession) {
    console.log("Redirigiendo a login por falta de autenticación");
    return <Redirect to="/login" />;
  }
  
  return <Component />;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard">
        <ProtectedRoute path="/dashboard" component={Dashboard} />
      </Route>
      <Route path="/profile">
        <ProtectedRoute path="/profile" component={Profile} />
      </Route>
      <Route path="/appointments">
        <ProtectedRoute path="/appointments" component={Appointments} />
      </Route>
      <Route path="/messages">
        <ProtectedRoute path="/messages" component={Messages} />
      </Route>
      <Route path="/consent-forms">
        <ProtectedRoute path="/consent-forms" component={ConsentForms} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <AppRoutes />
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
