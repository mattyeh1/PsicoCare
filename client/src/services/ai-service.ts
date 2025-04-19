import { apiRequest } from "@/lib/queryClient";

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

/**
 * Solicita la generación de un mensaje personalizado usando IA
 */
export async function generateMessage(params: MessageGenerationParams): Promise<string> {
  try {
    const response = await apiRequest("POST", "/api/ai/generate-message", params);
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
    const response = await apiRequest("POST", "/api/ai/improve-message", { message, instructions });
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
    const response = await apiRequest("POST", "/api/ai/suggest-title", { content });
    const data = await response.json();
    return data.title;
  } catch (error) {
    console.error("Error al sugerir título", error);
    return "Plantilla de mensaje";
  }
}