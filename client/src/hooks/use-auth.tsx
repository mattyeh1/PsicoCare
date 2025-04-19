import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  username: string;
  password: string;
  email: string;
  full_name: string;
  specialty: string;
  bio?: string;
  education?: string;
  certifications?: string;
  profile_image?: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<any, Error, LoginData>;
  logoutMutation: UseMutationResult<any, Error, void>;
  registerMutation: UseMutationResult<any, Error, RegisterData>;
  refetchUser?: () => Promise<any>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
    refetch: refetchUser
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: 1, // Permitir un reintento en caso de error de red
    retryDelay: 1000, // Esperar 1 segundo antes de reintentar
    initialData: null,
    staleTime: 2 * 60 * 1000, // 2 minutos antes de considerar los datos obsoletos (reducido)
    refetchInterval: 2 * 60 * 1000, // Refrescar cada 2 minutos (más frecuente)
    refetchIntervalInBackground: true,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true, // Importante: recargar al reconectar
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      try {
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
          credentials: "include",
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || "Credenciales incorrectas");
        }
        
        return data;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/user"], data);
      toast({
        title: "Inicio de sesión exitoso",
        description: "Bienvenido/a a PsiConnect",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error de inicio de sesión",
        description: error.message || "Credenciales incorrectas. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      try {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData),
          credentials: "include",
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || "Error al registrar usuario");
        }
        
        return data;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/user"], data);
      toast({
        title: "Registro exitoso",
        description: "Bienvenido/a a PsiConnect",
      });
    },
    onError: (error: Error) => {
      // Mostrar mensaje específico del error
      toast({
        title: "Error de registro",
        description: error.message || "Hubo un problema al crear tu cuenta. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        const res = await fetch("/api/logout", {
          method: "POST",
          credentials: "include",
        });
        
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Error al cerrar sesión");
        }
      } catch (error) {
        // Incluso si hay error, intentamos limpiar la caché del cliente
        console.error("Error durante el proceso de logout:", error);
        throw error;
      } finally {
        // Limpiar la caché del cliente independientemente del resultado
        localStorage.removeItem("lastKnownUser");
        sessionStorage.removeItem("userSession");
      }
    },
    onSuccess: () => {
      // Limpiar todos los datos relevantes de la caché
      queryClient.setQueryData(["/api/user"], null);
      
      // Invalidar todas las consultas que requieren autenticación
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = Array.isArray(query.queryKey) ? query.queryKey[0] : query.queryKey;
          return typeof queryKey === 'string' && queryKey.startsWith('/api/');
        },
      });
      
      // Mostrar notificación
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente.",
      });
    },
    onError: (error: Error) => {
      // A pesar del error, intentamos limpiar la caché
      queryClient.setQueryData(["/api/user"], null);
      
      toast({
        title: "Error al cerrar sesión",
        description: "Se ha cerrado la sesión pero hubo un problema con el servidor.",
        variant: "destructive",
      });
    },
  });

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        refetchUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}