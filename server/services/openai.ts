import OpenAI from "openai";

// Inicializar el cliente de OpenAI con la clave API
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Tipo de mensaje para generar
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
 * Genera un mensaje personalizado utilizando la API de OpenAI
 */
export async function generatePersonalizedMessage(params: MessageGenerationParams): Promise<string> {
  const {
    recipientName,
    messageType,
    recipientDetails = "",
    appointmentDate = "",
    appointmentTime = "",
    psychologistName = "",
    customInstructions = ""
  } = params;

  let prompt = `Genera un mensaje profesional y empático en español para un paciente en una clínica psicológica.
El mensaje es de tipo "${messageType}".
El nombre del paciente es "${recipientName}".`;

  if (psychologistName) {
    prompt += `\nEl mensaje debe ser firmado por el/la psicólogo/a "${psychologistName}".`;
  }

  if (recipientDetails) {
    prompt += `\nDetalles importantes sobre el paciente: "${recipientDetails}".`;
  }

  if (appointmentDate && appointmentTime) {
    prompt += `\nLa cita está programada para el ${appointmentDate} a las ${appointmentTime}.`;
  }

  if (customInstructions) {
    prompt += `\nInstrucciones adicionales: ${customInstructions}`;
  }

  prompt += `\n\nEl mensaje debe ser:
- Profesional pero cálido
- Respetuoso y empático
- Directo sin ser frío
- Adecuado para un contexto médico/psicológico
- De longitud moderada (no más de 3-4 párrafos cortos)
- Con saludo inicial y despedida formal
- Siguiendo las mejores prácticas de comunicación terapéutica`;

  try {
    // Usamos un modelo más compatible con la mayoría de las claves API
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Eres un asistente especializado en redactar comunicaciones profesionales para profesionales de la salud mental."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 700,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "Lo siento, no se pudo generar el mensaje.";
  } catch (error) {
    console.error("Error al generar mensaje con OpenAI:", error);
    throw new Error("Error al generar el mensaje personalizado. Por favor, inténtelo de nuevo más tarde.");
  }
}

/**
 * Función para mejorar un mensaje existente
 */
export async function improveMessage(originalMessage: string, instructions: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Usamos un modelo más compatible con la mayoría de claves API
      messages: [
        {
          role: "system",
          content: "Eres un experto en mejorar la comunicación escrita para profesionales de la salud mental."
        },
        {
          role: "user",
          content: `Mejora el siguiente mensaje según estas instrucciones: "${instructions}"\n\nMensaje original:\n${originalMessage}`
        }
      ],
      max_tokens: 700,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "No se pudo mejorar el mensaje.";
  } catch (error) {
    console.error("Error al mejorar mensaje con OpenAI:", error);
    throw new Error("Error al mejorar el mensaje. Por favor, inténtelo de nuevo más tarde.");
  }
}

/**
 * Función para sugerir títulos para plantillas de mensajes
 */
export async function suggestMessageTemplateTitle(content: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Usamos un modelo más compatible con la mayoría de claves API
      messages: [
        {
          role: "system",
          content: "Eres un especialista en categorizar y titular mensajes profesionales."
        },
        {
          role: "user",
          content: `Sugiere un título breve, descriptivo y profesional para la siguiente plantilla de mensaje:\n\n${content}`
        }
      ],
      max_tokens: 50,
      temperature: 0.5,
    });

    return response.choices[0].message.content || "Plantilla de mensaje";
  } catch (error) {
    console.error("Error al sugerir título con OpenAI:", error);
    return "Plantilla de mensaje";
  }
}