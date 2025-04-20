import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Configuración de fetch optimizada para autenticación
  console.log(`[API Request] ${method} ${url} - Con credenciales`);
  
  // Opciones avanzadas de fetch para garantizar envío de cookies
  const fetchOptions: RequestInit = {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      // Agregar cabeceras adicionales para asegurar compatibilidad
      "Accept": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      // Incluir una marca de tiempo para evitar cachés
      "Cache-Control": "no-cache, no-store, max-age=0",
      "Pragma": "no-cache"
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Esencial: incluir cookies en todas las solicitudes
    mode: "cors", // Asegurar modo CORS
    redirect: "follow", // Seguir redirecciones automáticamente
    cache: "no-store" // Evitar cualquier caché
  };
  
  try {
    const res = await fetch(url, fetchOptions);
    
    // Log adicional para diagnóstico
    console.log(`[API Response] ${method} ${url} - Status: ${res.status}`);
    
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`[API Error] ${method} ${url} - Error:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    console.log(`[Query] GET ${url} - Con credenciales`);
    
    // Usar las mismas opciones avanzadas que en apiRequest
    const fetchOptions: RequestInit = {
      method: 'GET',
      headers: {
        "Accept": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "Cache-Control": "no-cache, no-store, max-age=0",
        "Pragma": "no-cache"
      },
      credentials: "include", // Esencial: incluir cookies en todas las solicitudes
      mode: "cors", // Asegurar modo CORS
      redirect: "follow", // Seguir redirecciones automáticamente
      cache: "no-store" // Evitar cualquier caché
    };
    
    try {
      const res = await fetch(url, fetchOptions);
      
      console.log(`[Query Response] GET ${url} - Status: ${res.status}, SessionID en cookie: ${document.cookie.includes('connect.sid')}`);
      
      // Manejar 401 según la configuración
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.warn(`[Query] GET ${url} - No autenticado (401), retornando null`);
        return null;
      }
      
      await throwIfResNotOk(res);
      const data = await res.json();
      
      // Log con información truncada para no sobrecargar la consola
      console.log(`[Query Data] GET ${url} - Datos recibidos: ${
        JSON.stringify(data).substring(0, 100) + (JSON.stringify(data).length > 100 ? '...' : '')
      }`);
      
      return data;
    } catch (error) {
      console.error(`[Query Error] GET ${url} - Error:`, error);
      
      if (unauthorizedBehavior === "returnNull" && error instanceof Error && error.message.includes('401')) {
        console.warn(`[Query] GET ${url} - Manejando error 401, retornando null`);
        return null;
      }
      
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 5 * 60 * 1000, // 5 minutos
      retry: (failureCount, error) => {
        // Solo reintentar una vez si el error no es 401 (Unauthorized)
        return failureCount < 1 && 
               !(error instanceof Error && error.message.includes('401'));
      },
    },
    mutations: {
      retry: false,
    },
  },
});
