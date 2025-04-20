import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      // Intentar analizar como JSON primero
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const jsonError = await res.json();
        if (jsonError.error) {
          throw new Error(`${res.status}: ${jsonError.error}`);
        }
        throw new Error(`${res.status}: ${JSON.stringify(jsonError)}`);
      }
      
      // Si no es JSON o no tiene campo 'error', usar texto plano
      const text = await res.text() || res.statusText;
      throw new Error(`${res.status}: ${text}`);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      // Si falla la extracción de texto, proporcionar un mensaje genérico
      throw new Error(`${res.status}: Ocurrió un error en la solicitud`);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Verificamos si tenemos datos de sesión guardados localmente
  const hasLocalSession = localStorage.getItem('sessionActive') === 'true' || 
                          localStorage.getItem('lastKnownUser') !== null;
  
  // Configuración de fetch optimizada para autenticación
  console.log(`[API Request] ${method} ${url} - Con credenciales (Sesión local: ${hasLocalSession})`);
  
  // Agregar un token CSRF personalizado para mayor seguridad
  const csrfToken = localStorage.getItem('csrfToken') || `t-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  if (!localStorage.getItem('csrfToken')) {
    localStorage.setItem('csrfToken', csrfToken);
  }
  
  // Opciones avanzadas de fetch para garantizar envío de cookies
  const fetchOptions: RequestInit = {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      // Agregar cabeceras adicionales para asegurar compatibilidad
      "Accept": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "X-CSRF-Token": csrfToken,
      // Incluir una marca de tiempo para evitar cachés
      "Cache-Control": "no-cache, no-store, max-age=0",
      "Pragma": "no-cache",
      // Incluir información de sesión local en cabeceras
      "X-Has-Session": hasLocalSession ? "true" : "false"
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
    
    // Verificamos si tenemos datos de sesión guardados localmente
    const hasLocalSession = localStorage.getItem('sessionActive') === 'true' || 
                           localStorage.getItem('lastKnownUser') !== null;
                           
    console.log(`[Query] GET ${url} - Con credenciales (Sesión local: ${hasLocalSession})`);
    
    // Usar el mismo token CSRF de apiRequest
    const csrfToken = localStorage.getItem('csrfToken') || `t-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    if (!localStorage.getItem('csrfToken')) {
      localStorage.setItem('csrfToken', csrfToken);
    }
    
    // Usar las mismas opciones avanzadas que en apiRequest
    const fetchOptions: RequestInit = {
      method: 'GET',
      headers: {
        "Accept": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "X-CSRF-Token": csrfToken,
        "Cache-Control": "no-cache, no-store, max-age=0",
        "Pragma": "no-cache",
        // Incluir información de sesión local en cabeceras
        "X-Has-Session": hasLocalSession ? "true" : "false"
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
