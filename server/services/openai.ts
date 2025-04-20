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

  try {
    // Verificar si estamos en modo de simulación o si hay una clave API válida
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '') {
      console.log("Modo de simulación: No se encontró clave API de OpenAI válida para generar mensaje");
      return simulatePersonalizedMessage(params);
    }
    
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
    } catch (apiError) {
      console.error("Error al generar mensaje con OpenAI:", apiError);
      console.log("Usando modo de simulación para mensaje personalizado debido a error de API");
      return simulatePersonalizedMessage(params);
    }
  } catch (error) {
    console.error("Error general al generar mensaje personalizado:", error);
    throw new Error("Error al generar el mensaje personalizado. Por favor, inténtelo de nuevo más tarde.");
  }
}

/**
 * Función auxiliar para simular mensajes personalizados cuando la API no está disponible
 */
function simulatePersonalizedMessage(params: MessageGenerationParams): string {
  console.log("Simulando generación de mensaje personalizado");
  const {
    recipientName,
    messageType,
    recipientDetails = "",
    appointmentDate = "",
    appointmentTime = "",
    psychologistName = "",
    customInstructions = ""
  } = params;
  
  let messageTemplate = "";
  
  // Seleccionar plantilla según el tipo de mensaje
  switch (messageType.toLowerCase()) {
    case "appointment_reminder":
    case "recordatorio":
      messageTemplate = `Estimado/a ${recipientName},\n\nLe recordamos que tiene una cita programada ${appointmentDate ? `para el día ${appointmentDate}` : ""} ${appointmentTime ? `a las ${appointmentTime}` : ""}.\n\nAgradecemos confirmar su asistencia. En caso de no poder asistir, le pedimos que nos avise con al menos 24 horas de anticipación.\n\n`;
      break;
      
    case "follow_up":
    case "seguimiento":
      messageTemplate = `Estimado/a ${recipientName},\n\nEspero que se encuentre bien. Quería hacer un seguimiento después de nuestra última sesión ${appointmentDate ? `del ${appointmentDate}` : ""}.\n\nRecuerde que estoy disponible para responder cualquier duda que pueda surgir entre sesiones.\n\n`;
      break;
      
    case "welcome":
    case "bienvenida":
      messageTemplate = `Bienvenido/a ${recipientName},\n\nEs un placer darle la bienvenida a nuestro consultorio. ${appointmentDate ? `Nuestra primera cita está programada para el ${appointmentDate}` : "Esperamos poder acompañarle en su proceso terapéutico"} ${appointmentTime ? `a las ${appointmentTime}` : ""}.\n\nSi tiene alguna pregunta o inquietud antes de nuestra primera sesión, no dude en contactarnos.\n\n`;
      break;
      
    case "cancellation":
    case "cancelación":
      messageTemplate = `Estimado/a ${recipientName},\n\nLamento informarle que debemos cancelar la cita programada ${appointmentDate ? `para el ${appointmentDate}` : ""} ${appointmentTime ? `a las ${appointmentTime}` : ""}.\n\nPor favor, póngase en contacto con nosotros para reprogramar en un horario conveniente para usted.\n\n`;
      break;
      
    case "rescheduling":
    case "reprogramación":
      messageTemplate = `Estimado/a ${recipientName},\n\nEn seguimiento a nuestra conversación, confirmamos la reprogramación de su cita ${appointmentDate ? `para el día ${appointmentDate}` : ""} ${appointmentTime ? `a las ${appointmentTime}` : ""}.\n\nAgradecemos su comprensión y flexibilidad.\n\n`;
      break;
      
    default:
      messageTemplate = `Estimado/a ${recipientName},\n\nGracias por comunicarse con nosotros. ${recipientDetails ? `He tomado nota de: ${recipientDetails}` : ""}\n\nEstamos a su disposición para cualquier consulta o inquietud que pueda tener.\n\n`;
  }
  
  // Agregar firma
  if (psychologistName) {
    messageTemplate += `Atentamente,\n${psychologistName}\nPsiConnect`;
  } else {
    messageTemplate += "Atentamente,\nPsiConnect";
  }
  
  return messageTemplate;
}

/**
 * Función para mejorar un mensaje existente
 */
export async function improveMessage(originalMessage: string, instructions: string): Promise<string> {
  try {
    // Verificar si estamos en modo de simulación o si hay una clave API válida
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '') {
      console.log("Modo de simulación: No se encontró clave API de OpenAI válida");
      // Devolver una versión mejorada simulada
      return simulateImprovedMessage(originalMessage, instructions);
    }
    
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
    } catch (apiError) {
      console.error("Error al mejorar mensaje con OpenAI:", apiError);
      // Si hay un error de API, usar la simulación
      console.log("Usando modo de simulación debido a error de API");
      return simulateImprovedMessage(originalMessage, instructions);
    }
  } catch (error) {
    console.error("Error general al mejorar mensaje:", error);
    throw new Error("Error al mejorar el mensaje. Por favor, inténtelo de nuevo más tarde.");
  }
}

/**
 * Función auxiliar para simular mejoras en los mensajes cuando la API no está disponible
 */
function simulateImprovedMessage(originalMessage: string, instructions: string): string {
  console.log("Simulando mejora de mensaje");
  // Crear versiones mejoradas básicas según diferentes instrucciones
  
  // Detectar instrucciones comunes
  const makeMoreFormal = instructions.toLowerCase().includes("formal");
  const makeMoreFriendly = instructions.toLowerCase().includes("amigable") || 
                          instructions.toLowerCase().includes("cercano") ||
                          instructions.toLowerCase().includes("cálido");
  const makeMoreClear = instructions.toLowerCase().includes("claro") ||
                       instructions.toLowerCase().includes("claridad");
  
  let improvedMessage = originalMessage;
  
  // Mejoras básicas
  improvedMessage = improvedMessage.replace(/hola/i, "Estimado/a");
  improvedMessage = improvedMessage.replace(/adios/i, "Atentamente");
  
  if (makeMoreFormal) {
    improvedMessage = `Estimado/a paciente:\n\n${improvedMessage}\n\nAtentamente,\nSu terapeuta`;
    improvedMessage = improvedMessage.replace(/te/g, "le");
    improvedMessage = improvedMessage.replace(/tu/g, "su");
  }
  
  if (makeMoreFriendly) {
    improvedMessage = `Hola,\n\n${improvedMessage}\n\nSaludos cordiales,\nTu terapeuta`;
    improvedMessage = improvedMessage.replace(/lamento informarle/i, "quería comentarte");
  }
  
  if (makeMoreClear) {
    // Añadir estructura
    if (!improvedMessage.includes(":\n")) {
      const lines = improvedMessage.split("\n");
      improvedMessage = lines.map(line => line.trim()).join("\n\n");
    }
  }
  
  // Añadir una firma profesional si no existe
  if (!improvedMessage.toLowerCase().includes("atentamente") && 
      !improvedMessage.toLowerCase().includes("saludos") &&
      !improvedMessage.toLowerCase().includes("cordialmente")) {
    improvedMessage += "\n\nSaludos cordiales,\nPsiConnect";
  }
  
  return improvedMessage;
}

/**
 * Función para sugerir títulos para plantillas de mensajes
 */
export async function suggestMessageTemplateTitle(content: string): Promise<string> {
  try {
    // Verificar si estamos en modo de simulación o si hay una clave API válida
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '') {
      console.log("Modo de simulación: No se encontró clave API de OpenAI válida para sugerir título");
      return simulateTitleSuggestion(content);
    }
    
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
    } catch (apiError) {
      console.error("Error al sugerir título con OpenAI:", apiError);
      console.log("Usando modo de simulación para título debido a error de API");
      return simulateTitleSuggestion(content);
    }
  } catch (error) {
    console.error("Error general al sugerir título:", error);
    return "Plantilla de mensaje";
  }
}

/**
 * Función auxiliar para simular sugerencias de títulos cuando la API no está disponible
 */
function simulateTitleSuggestion(content: string): string {
  console.log("Simulando sugerencia de título para mensaje");
  
  const lowerContent = content.toLowerCase();
  
  // Detectar tipo de mensaje basado en palabras clave
  if (lowerContent.includes("cita") || lowerContent.includes("sesión") || lowerContent.includes("agenda")) {
    return "Recordatorio de Cita";
  }
  
  if (lowerContent.includes("bienvenid")) {
    return "Mensaje de Bienvenida";
  }
  
  if (lowerContent.includes("cancel")) {
    return "Notificación de Cancelación";
  }
  
  if (lowerContent.includes("reprogramar") || lowerContent.includes("reagendar")) {
    return "Reprogramación de Cita";
  }
  
  if (lowerContent.includes("seguimiento") || lowerContent.includes("progreso")) {
    return "Seguimiento Terapéutico";
  }
  
  if (lowerContent.includes("pago") || lowerContent.includes("factura") || lowerContent.includes("tarifa")) {
    return "Información de Pago";
  }
  
  // Título genérico si no se identifica un tipo específico
  return "Comunicación Profesional";
}