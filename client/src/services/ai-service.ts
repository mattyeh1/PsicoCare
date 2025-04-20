import { apiRequest, queryClient } from "@/lib/queryClient";

// Tipo de mensaje para generación
export type MessageGenerationParams = {
  recipientName: string;
  messageType: string;
  recipientDetails?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  psychologistName?: string;
  customInstructions?: string;
};

// Función auxiliar para verificar la sesión antes de hacer peticiones
const ensureAuthenticated = async () => {
  // Verificar si hay un usuario en la caché
  const user = queryClient.getQueryData(["/api/user"]);
  
  if (!user) {
    // Si no hay usuario, intentar refrescar los datos
    try {
      await queryClient.fetchQuery({ queryKey: ["/api/user"] });
    } catch (error) {
      console.error("Error de autenticación en servicio AI:", error);
      throw new Error("Sesión expirada o inválida. Por favor, inicie sesión nuevamente.");
    }
  }
};

/**
 * Solicita la generación de un mensaje personalizado usando IA
 */
export async function generateMessage(params: MessageGenerationParams): Promise<string> {
  try {
    // Asegurar que la sesión esté activa
    await ensureAuthenticated();
    
    const response = await apiRequest("POST", "/api/ai/generate-message", params);
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Sesión expirada. Inicie sesión para continuar.");
      }
      throw new Error(`Error del servidor: ${response.status}`);
    }
    
    const data = await response.json();
    return data.message;
  } catch (error) {
    console.error("Error al generar mensaje", error);
    throw new Error("No se pudo generar el mensaje personalizado. Por favor, inténtelo de nuevo.");
  }
}

/**
 * Solicita mejorar un mensaje existente
 */
export async function improveMessage(message: string, instructions: string): Promise<string> {
  try {
    // Asegurar que la sesión esté activa
    await ensureAuthenticated();
    
    const response = await apiRequest("POST", "/api/ai/improve-message", { message, instructions });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Sesión expirada. Inicie sesión para continuar.");
      }
      throw new Error(`Error del servidor: ${response.status}`);
    }
    
    const data = await response.json();
    return data.message;
  } catch (error) {
    console.error("Error al mejorar mensaje", error);
    throw new Error("No se pudo mejorar el mensaje. Por favor, inténtelo de nuevo.");
  }
}

/**
 * Solicita sugerir un título para una plantilla de mensaje
 */
export async function suggestTitle(content: string): Promise<string> {
  try {
    // Asegurar que la sesión esté activa
    await ensureAuthenticated();
    
    const response = await apiRequest("POST", "/api/ai/suggest-title", { content });
    
    if (!response.ok) {
      if (response.status === 401) {
        // En caso de error de autenticación, devolver un valor por defecto
        console.warn("Sesión expirada al sugerir título");
        return "Plantilla de mensaje";
      }
      throw new Error(`Error del servidor: ${response.status}`);
    }
    
    const data = await response.json();
    return data.title;
  } catch (error) {
    console.error("Error al sugerir título", error);
    return "Plantilla de mensaje";
  }
}