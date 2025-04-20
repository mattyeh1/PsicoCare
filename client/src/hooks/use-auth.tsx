import { createContext, ReactNode, useContext, useEffect } from "react";
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
  // Intenta recuperar el último usuario conocido del almacenamiento local
  const cachedUser = localStorage.getItem('lastKnownUser');
  const initialUser = cachedUser ? JSON.parse(cachedUser) : null;

  const {
    data: user,
    error,
    isLoading,
    refetch: refetchUser
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: 3, // Aumentar reintentos en caso de error de red
    retryDelay: 1000, // Esperar 1 segundo antes de reintentar
    initialData: initialUser, // Usar el usuario en caché como datos iniciales
    staleTime: 30 * 1000, // Reducir a 30 segundos para verificar más a menudo
    refetchInterval: 60 * 1000, // Refrescar cada 1 minuto
    refetchIntervalInBackground: true,
    refetchOnMount: "always", // Siempre verificar al montar componentes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true, // Importante: recargar al reconectar
  });
  
  // Guarda el usuario en localStorage cuando cambia y no es nulo
  useEffect(() => {
    if (user) {
      localStorage.setItem('lastKnownUser', JSON.stringify(user));
    }
  }, [user]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      try {
        console.log("Iniciando solicitud de login con:", credentials.username);
        
        // Usamos apiRequest para mantener consistencia en todas las peticiones
        const res = await apiRequest("POST", "/api/login", credentials);
        
        // Verificar cookies después del login
        console.log("Cookies después de login:", document.cookie);
        
        if (!res.ok) {
          // Intentar extraer mensaje de error de la respuesta
          let errorMessage = "Error al iniciar sesión";
          try {
            const errorData = await res.json();
            if (errorData && errorData.error) {
              errorMessage = errorData.error;
            }
          } catch (e) {
            console.error("No se pudo parsear respuesta de error:", e);
          }
          
          throw new Error(errorMessage);
        }
        
        try {
          const data = await res.json();
          console.log("Datos de login recibidos:", {
            ...data,
            id: data.id,
            username: data.username
          });
          return data;
        } catch (parseError) {
          console.error("Error al procesar JSON de respuesta:", parseError);
          throw new Error("Error procesando la respuesta del servidor");
        }
      } catch (error: any) {
        console.error("Error en proceso de login:", error);
        
        // Si el error es un objeto con un mensaje, extraerlo
        if (error.message) {
          throw new Error(error.message);
        }
        
        // Si es otro tipo de error, lanzar un mensaje genérico
        throw new Error("Error al iniciar sesión. Credenciales incorrectas o problema de conexión.");
      }
    },
    onSuccess: (data) => {
      console.log("Login completado, actualizando caché del usuario");
      // Guardar el usuario en la caché de la consulta
      queryClient.setQueryData(["/api/user"], data);
      
      // Refrescar todas las consultas que dependen de la autenticación
      queryClient.invalidateQueries({ 
        queryKey: ["/api/user"]
      });
      
      // Guardar indicador de sesión activa en almacenamiento local
      localStorage.setItem("sessionActive", "true");
      sessionStorage.setItem("userSession", "active");
      
      toast({
        title: "Inicio de sesión exitoso",
        description: "Bienvenido/a a PsiConnect",
      });
    },
    onError: (error: Error) => {
      console.error("Error en login mutation:", error);
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
        console.log("Iniciando registro con:", {
          ...userData,
          password: '[REDACTED]'
        });
        
        // Usamos apiRequest para mantener consistencia en la forma de hacer peticiones
        const res = await apiRequest("POST", "/api/register", userData);
        
        // Verificar si hay cookies después del registro
        console.log("Cookies después de registro:", document.cookie);
        
        if (!res.ok) {
          // Intentar extraer mensaje de error de la respuesta
          let errorMessage = "Error al registrar usuario";
          try {
            const errorData = await res.json();
            if (errorData && errorData.error) {
              errorMessage = errorData.error;
            }
          } catch (e) {
            console.error("No se pudo parsear respuesta de error:", e);
          }
          
          throw new Error(errorMessage);
        }
        
        try {
          const data = await res.json();
          console.log("Datos de registro recibidos:", {
            ...data,
            id: data.id,
            username: data.username
          });
          return data;
        } catch (parseError) {
          console.error("Error al procesar JSON de respuesta:", parseError);
          throw new Error("Error procesando la respuesta del servidor");
        }
      } catch (error: any) {
        console.error("Error en proceso de registro:", error);
        
        // Si el error es un objeto con un mensaje, extraerlo
        if (error.message) {
          throw new Error(error.message);
        }
        
        // Si es otro tipo de error, lanzar un mensaje genérico
        throw new Error("Error al registrar usuario. Inténtalo de nuevo más tarde.");
      }
    },
    onSuccess: (data) => {
      console.log("Registro completado, actualizando caché del usuario");
      // Guardar el usuario en la caché de la consulta
      queryClient.setQueryData(["/api/user"], data);
      
      // Refrescar todas las consultas que dependen de la autenticación
      queryClient.invalidateQueries({ 
        queryKey: ["/api/user"]
      });
      
      // Guardar indicador de sesión activa en almacenamiento local
      localStorage.setItem("sessionActive", "true");
      localStorage.setItem("lastKnownUser", JSON.stringify(data));
      sessionStorage.setItem("userSession", "active");
      
      toast({
        title: "Registro exitoso",
        description: "Bienvenido/a a PsiConnect",
      });
    },
    onError: (error: Error) => {
      console.error("Error en registro mutation:", error);
      
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
        console.log("Iniciando proceso de logout");
        console.log("Estado de cookies antes de logout:", document.cookie);
        
        // Usamos apiRequest para mantener consistencia en todas las peticiones
        const res = await apiRequest("POST", "/api/logout");
        
        console.log("Logout exitoso en el servidor");
        console.log("Estado de cookies después de logout:", document.cookie);
        
        // Forzar limpieza manual de cookies en caso de que el servidor no lo haga
        document.cookie = "psiconnect.sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
        document.cookie = "connect.sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
        document.cookie = "session_active=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
        
        // No todos los endpoints devuelven JSON
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          return await res.json();
        }
        return { success: true };
      } catch (error: any) {
        // Incluso si hay error, intentamos limpiar la caché del cliente
        console.error("Error durante el proceso de logout:", error);
        throw new Error(error.message || "Error al cerrar sesión");
      } finally {
        console.log("Limpiando datos locales de sesión");
        // Limpiar toda la información de sesión del cliente
        localStorage.removeItem("lastKnownUser");
        localStorage.removeItem("sessionActive");
        localStorage.removeItem("csrfToken");
        sessionStorage.removeItem("userSession");
      }
    },
    onSuccess: () => {
      console.log("Logout completado, limpiando caché");
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
      
      // Redirigir a la página de login después de un breve retraso
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    },
    onError: (error: Error) => {
      console.error("Error en logout mutation:", error);
      
      // A pesar del error, intentamos limpiar la caché
      queryClient.setQueryData(["/api/user"], null);
      
      toast({
        title: "Error al cerrar sesión",
        description: "Se ha cerrado la sesión pero hubo un problema con el servidor.",
        variant: "destructive",
      });
      
      // Redirigir a la página de login incluso si hay error
      setTimeout(() => {
        window.location.href = "/login";
      }, 1000);
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