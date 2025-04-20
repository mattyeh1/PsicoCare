import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema,
  insertPatientSchema,
  insertAppointmentSchema,
  insertAvailabilitySchema,
  insertMessageTemplateSchema,
  insertConsentFormSchema,
  insertPatientConsentSchema,
  insertContactRequestSchema,
  users,
  patients,
  appointments,
  availability
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { setupAuth } from "./auth";
import { 
  generatePersonalizedMessage, 
  improveMessage, 
  suggestMessageTemplateTitle,
  type MessageGenerationParams 
} from "./services/openai";
import { db } from "./db";
import { eq } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // Authentication middleware with improved session handling
  const isAuthenticated = (req: Request, res: Response, next: any) => {
    // Verify if session is authenticated and user exists
    if (req.isAuthenticated() && req.user && req.user.id) {
      // Log authenticated access
      console.log(`Usuario autenticado: ${req.user.id} - ruta: ${req.path}`);
      return next();
    }
    
    // Determine if it's an API request or page request
    const isApiRequest = req.path.startsWith('/api/');
    
    if (isApiRequest) {
      // For API requests, return JSON response
      console.log(`Acceso no autorizado a: ${req.path}`);
      return res.status(401).json({ 
        error: "No autorizado", 
        message: "La sesión ha expirado o no está autenticada"
      });
    } else {
      // For page requests, redirect to login (handled by frontend)
      return res.status(401).json({ 
        error: "No autorizado", 
        redirect: "/auth"
      });
    }
  };
  
  // Role-based authorization middleware
  const isPsychologist = (req: Request, res: Response, next: any) => {
    if (req.isAuthenticated() && req.user && req.user.id && (req.user as any).user_type === 'psychologist') {
      return next();
    }
    console.log(`Acceso denegado a usuario no psicólogo: ${(req.user as any)?.id} - ruta: ${req.path}`);
    return res.status(403).json({ 
      error: "Acceso denegado", 
      message: "Esta función está disponible solo para psicólogos"
    });
  };

  // Error handling middleware for Zod validation
  const validateRequest = (schema: any) => {
    return (req: Request, res: Response, next: any) => {
      try {
        req.body = schema.parse(req.body);
        next();
      } catch (error) {
        if (error instanceof ZodError) {
          const validationError = fromZodError(error);
          res.status(400).json({ message: validationError.message });
        } else {
          next(error);
        }
      }
    };
  };

  // User routes
  app.get("/api/users/:id", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(parseInt(req.params.id));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Error fetching user" });
    }
  });

  app.put("/api/users/:id", isAuthenticated, validateRequest(insertUserSchema.partial()), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if the user is updating their own profile
      if ((req.user as any).id !== userId) {
        return res.status(403).json({ message: "Not authorized to update this user" });
      }
      
      const updatedUser = await storage.updateUser(userId, req.body);
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Error updating user" });
    }
  });

  // Patient routes
  app.get("/api/patients", isAuthenticated, isPsychologist, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const patients = await storage.getPatientsForPsychologist(userId);
      res.json(patients);
    } catch (error) {
      res.status(500).json({ message: "Error fetching patients" });
    }
  });

  app.post("/api/patients", isAuthenticated, isPsychologist, validateRequest(insertPatientSchema), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      console.log("Creando paciente con datos:", req.body);
      const patientData = { ...req.body, psychologist_id: userId };
      console.log("Datos completos a insertar:", patientData);
      const patient = await storage.createPatient(patientData);
      res.status(201).json(patient);
    } catch (error) {
      console.error("Error al crear paciente:", error);
      res.status(500).json({ message: "Error creating patient", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/patients/:id", isAuthenticated, isPsychologist, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const patient = await storage.getPatient(parseInt(req.params.id));
      
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      // Ensure the patient belongs to this psychologist
      if (patient.psychologist_id !== userId) {
        return res.status(403).json({ message: "Not authorized to access this patient" });
      }
      
      res.json(patient);
    } catch (error) {
      res.status(500).json({ message: "Error fetching patient" });
    }
  });

  // Appointment routes
  app.get("/api/appointments", isAuthenticated, isPsychologist, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      // Mejorado para consultar directamente de la base de datos para asegurar que se muestran todas las citas
      const queryResult = await db.select()
        .from(appointments)
        .where(eq(appointments.psychologist_id, userId))
        .orderBy(appointments.date);
      
      console.log(`Psicólogo #${userId} consultando citas. Encontradas: ${queryResult.length}`);
      
      // Si hay algún filtro de estado en la consulta, se puede aplicar aquí
      const statusFilter = req.query.status as string | undefined;
      let filteredResults = queryResult;
      
      if (statusFilter && statusFilter !== 'all') {
        filteredResults = queryResult.filter(appointment => appointment.status === statusFilter);
        console.log(`  Filtrado por estado '${statusFilter}': ${filteredResults.length} citas`);
      }
      
      res.json(filteredResults);
    } catch (error) {
      console.error("Error al obtener citas:", error);
      res.status(500).json({ message: "Error fetching appointments" });
    }
  });

  app.post("/api/appointments", isAuthenticated, isPsychologist, validateRequest(insertAppointmentSchema), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const appointmentData = { ...req.body, psychologist_id: userId };
      const appointment = await storage.createAppointment(appointmentData);
      res.status(201).json(appointment);
    } catch (error) {
      res.status(500).json({ message: "Error creating appointment" });
    }
  });

  app.put("/api/appointments/:id", isAuthenticated, isPsychologist, validateRequest(insertAppointmentSchema.partial()), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const appointmentId = parseInt(req.params.id);
      const appointment = await storage.getAppointment(appointmentId);
      
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      // Ensure the appointment belongs to this psychologist
      if (appointment.psychologist_id !== userId) {
        return res.status(403).json({ message: "Not authorized to update this appointment" });
      }
      
      const updatedAppointment = await storage.updateAppointment(appointmentId, req.body);
      res.json(updatedAppointment);
    } catch (error) {
      res.status(500).json({ message: "Error updating appointment" });
    }
  });

  // Ruta para que los psicólogos aprueben o rechacen citas pendientes
  app.put("/api/appointments/:id/status", isAuthenticated, isPsychologist, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const appointmentId = parseInt(req.params.id);
      const { status, notes } = req.body;
      
      if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Estado no válido. Debe ser 'approved' o 'rejected'" });
      }
      
      const appointment = await storage.getAppointment(appointmentId);
      
      if (!appointment) {
        return res.status(404).json({ message: "Cita no encontrada" });
      }
      
      // Verificar que la cita pertenece a este psicólogo
      if (appointment.psychologist_id !== userId) {
        return res.status(403).json({ message: "No estás autorizado para modificar esta cita" });
      }
      
      // La cita debe estar en estado "pending" para poder ser aprobada o rechazada
      if (appointment.status !== 'pending') {
        return res.status(400).json({ 
          message: `No es posible ${status === 'approved' ? 'aprobar' : 'rechazar'} una cita que no está pendiente` 
        });
      }
      
      // Actualizar el estado de la cita y añadir notas si existen
      const updatedData: any = { status };
      if (notes) updatedData.notes = notes;
      
      const updatedAppointment = await storage.updateAppointment(appointmentId, updatedData);
      res.json(updatedAppointment);
    } catch (error) {
      console.error("Error al actualizar el estado de la cita:", error);
      res.status(500).json({ message: "Error al actualizar el estado de la cita" });
    }
  });
  
  // Endpoints específicos para aprobar/rechazar citas (para trabajar con el frontend existente)
  app.post("/api/appointments/:id/approve", isAuthenticated, isPsychologist, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const appointmentId = parseInt(req.params.id);
      const { notes } = req.body;
      
      const appointment = await storage.getAppointment(appointmentId);
      
      if (!appointment) {
        return res.status(404).json({ message: "Cita no encontrada" });
      }
      
      // Verificar que la cita pertenece a este psicólogo
      if (appointment.psychologist_id !== userId) {
        return res.status(403).json({ message: "No estás autorizado para modificar esta cita" });
      }
      
      // La cita debe estar en estado "pending" para poder ser aprobada
      if (appointment.status !== 'pending') {
        return res.status(400).json({ 
          message: "No es posible aprobar una cita que no está pendiente" 
        });
      }
      
      // Actualizar el estado de la cita y añadir notas si existen
      const updatedData: any = { status: 'approved' };
      if (notes) updatedData.notes = notes;
      
      const updatedAppointment = await storage.updateAppointment(appointmentId, updatedData);
      
      console.log(`Cita #${appointmentId} aprobada por psicólogo #${userId}`);
      res.json(updatedAppointment);
    } catch (error) {
      console.error("Error al aprobar la cita:", error);
      res.status(500).json({ message: "Error al aprobar la cita" });
    }
  });
  
  app.post("/api/appointments/:id/reject", isAuthenticated, isPsychologist, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const appointmentId = parseInt(req.params.id);
      const { reason } = req.body;
      
      if (!reason || !reason.trim()) {
        return res.status(400).json({ message: "Se requiere indicar un motivo para rechazar la cita" });
      }
      
      const appointment = await storage.getAppointment(appointmentId);
      
      if (!appointment) {
        return res.status(404).json({ message: "Cita no encontrada" });
      }
      
      // Verificar que la cita pertenece a este psicólogo
      if (appointment.psychologist_id !== userId) {
        return res.status(403).json({ message: "No estás autorizado para modificar esta cita" });
      }
      
      // La cita debe estar en estado "pending" para poder ser rechazada
      if (appointment.status !== 'pending') {
        return res.status(400).json({ 
          message: "No es posible rechazar una cita que no está pendiente" 
        });
      }
      
      // Actualizar el estado de la cita y añadir el motivo del rechazo
      const updatedAppointment = await storage.updateAppointment(appointmentId, { 
        status: 'rejected',
        notes: reason 
      });
      
      console.log(`Cita #${appointmentId} rechazada por psicólogo #${userId}: ${reason}`);
      res.json(updatedAppointment);
    } catch (error) {
      console.error("Error al rechazar la cita:", error);
      res.status(500).json({ message: "Error al rechazar la cita" });
    }
  });

  // Availability routes
  app.get("/api/availability", isAuthenticated, isPsychologist, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const availabilitySlots = await storage.getAvailabilityForPsychologist(userId);
      res.json(availabilitySlots);
    } catch (error) {
      res.status(500).json({ message: "Error fetching availability" });
    }
  });

  app.post("/api/availability", isAuthenticated, isPsychologist, validateRequest(insertAvailabilitySchema), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const availabilityData = { ...req.body, psychologist_id: userId };
      const availability = await storage.createAvailability(availabilityData);
      res.status(201).json(availability);
    } catch (error) {
      res.status(500).json({ message: "Error creating availability" });
    }
  });

  app.delete("/api/availability/:id", isAuthenticated, isPsychologist, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const availabilityId = parseInt(req.params.id);
      const availability = await storage.getAvailability(availabilityId);
      
      if (!availability) {
        return res.status(404).json({ message: "Availability not found" });
      }
      
      // Ensure the availability belongs to this psychologist
      if (availability.psychologist_id !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this availability" });
      }
      
      await storage.deleteAvailability(availabilityId);
      res.json({ message: "Availability deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting availability" });
    }
  });

  // Message template routes
  app.get("/api/message-templates", isAuthenticated, isPsychologist, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const templates = await storage.getMessageTemplatesForPsychologist(userId);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Error fetching message templates" });
    }
  });

  app.post("/api/message-templates", isAuthenticated, isPsychologist, validateRequest(insertMessageTemplateSchema), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const templateData = { ...req.body, psychologist_id: userId };
      const template = await storage.createMessageTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      res.status(500).json({ message: "Error creating message template" });
    }
  });

  // Consent form routes
  app.get("/api/consent-forms", isAuthenticated, isPsychologist, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const forms = await storage.getConsentFormsForPsychologist(userId);
      res.json(forms);
    } catch (error) {
      res.status(500).json({ message: "Error fetching consent forms" });
    }
  });

  app.post("/api/consent-forms", isAuthenticated, isPsychologist, validateRequest(insertConsentFormSchema), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const formData = { ...req.body, psychologist_id: userId };
      const form = await storage.createConsentForm(formData);
      res.status(201).json(form);
    } catch (error) {
      res.status(500).json({ message: "Error creating consent form" });
    }
  });

  // Patient consent routes
  app.get("/api/patient-consents", isAuthenticated, isPsychologist, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const patientConsents = await storage.getPatientConsentsForPsychologist(userId);
      res.json(patientConsents);
    } catch (error) {
      res.status(500).json({ message: "Error fetching patient consents" });
    }
  });

  app.post("/api/patient-consents", isAuthenticated, isPsychologist, validateRequest(insertPatientConsentSchema), async (req, res) => {
    try {
      const patientConsent = await storage.createPatientConsent(req.body);
      res.status(201).json(patientConsent);
    } catch (error) {
      res.status(500).json({ message: "Error creating patient consent" });
    }
  });

  // Contact request route
  app.post("/api/contact-requests", validateRequest(insertContactRequestSchema), async (req, res) => {
    try {
      const contactRequest = await storage.createContactRequest(req.body);
      res.status(201).json({ message: "Contact request submitted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error submitting contact request" });
    }
  });
  
  // Ruta para obtener las citas de un paciente
  app.get("/api/my-appointments", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const userType = (req.user as any).user_type;
      
      // Verificar que sea un paciente
      if (userType !== 'patient') {
        return res.status(403).json({ 
          error: "Acceso denegado", 
          message: "Esta función está disponible solo para pacientes"
        });
      }
      
      // Obtener los datos del paciente para encontrar su información
      const patient = await storage.getPatientByUserId(userId);
      
      if (!patient) {
        return res.status(404).json({ 
          error: "No encontrado", 
          message: "No se encontró información de paciente asociada a tu cuenta"
        });
      }
      
      // Consultar la base de datos para obtener las citas del paciente
      const patientAppointments = await db.select()
        .from(appointments)
        .where(eq(appointments.patient_id, patient.id))
        .orderBy(appointments.date);
      
      res.json(patientAppointments);
    } catch (error) {
      console.error("Error al obtener citas del paciente:", error);
      res.status(500).json({ 
        error: "Error del servidor", 
        message: "No se pudieron obtener las citas"
      });
    }
  });
  
  // Ruta para que un paciente solicite una cita
  app.post("/api/my-appointments", isAuthenticated, validateRequest(insertAppointmentSchema), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const userType = (req.user as any).user_type;
      
      // Verificar que sea un paciente
      if (userType !== 'patient') {
        return res.status(403).json({ 
          error: "Acceso denegado", 
          message: "Esta función está disponible solo para pacientes"
        });
      }
      
      // Obtener los datos del paciente para encontrar su información
      const patient = await storage.getPatientByUserId(userId);
      
      if (!patient) {
        return res.status(404).json({ 
          error: "No encontrado", 
          message: "No se encontró información de paciente asociada a tu cuenta"
        });
      }
      
      // Preparar los datos para la cita
      const appointmentData = { 
        ...req.body,
        psychologist_id: patient.psychologist_id,
        patient_id: patient.id,
        status: "pending" // Las citas solicitadas por pacientes están pendientes de aprobación
      };
      
      // Crear la cita
      const appointment = await storage.createAppointment(appointmentData);
      res.status(201).json(appointment);
    } catch (error) {
      console.error("Error al crear cita:", error);
      res.status(500).json({ 
        error: "Error del servidor", 
        message: "No se pudo crear la cita"
      });
    }
  });

  // Rutas específicas para pacientes
  // Obtener el psicólogo asociado al paciente
  app.get("/api/my-psychologist", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const userType = (req.user as any).user_type;
      
      // Verificar que sea un paciente
      if (userType !== 'patient') {
        return res.status(403).json({ 
          error: "Acceso denegado", 
          message: "Esta función está disponible solo para pacientes"
        });
      }
      
      // Obtener los datos del paciente para encontrar su psicólogo
      const patient = await storage.getPatientByUserId(userId);
      
      if (!patient) {
        return res.status(404).json({ 
          error: "No encontrado", 
          message: "No se encontró información de paciente asociada a tu cuenta"
        });
      }
      
      // Obtener información del psicólogo
      const psychologist = await storage.getUser(patient.psychologist_id);
      
      if (!psychologist) {
        return res.status(404).json({ 
          error: "No encontrado", 
          message: "No se encontró información del psicólogo asociado"
        });
      }
      
      // Eliminar la contraseña de la respuesta
      const { password, ...psychologistData } = psychologist;
      res.json(psychologistData);
    } catch (error) {
      console.error("Error al obtener psicólogo asociado:", error);
      res.status(500).json({ 
        error: "Error del servidor", 
        message: "No se pudo obtener la información del psicólogo"
      });
    }
  });
  
  // Obtener disponibilidad del psicólogo asociado al paciente
  app.get("/api/my-psychologist/availability", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const userType = (req.user as any).user_type;
      
      // Verificar que sea un paciente
      if (userType !== 'patient') {
        return res.status(403).json({ 
          error: "Acceso denegado", 
          message: "Esta función está disponible solo para pacientes"
        });
      }
      
      // Obtener los datos del paciente para encontrar su psicólogo
      const patient = await storage.getPatientByUserId(userId);
      
      if (!patient) {
        return res.status(404).json({ 
          error: "No encontrado", 
          message: "No se encontró información de paciente asociada a tu cuenta"
        });
      }
      
      // Obtener disponibilidad del psicólogo
      const availability = await storage.getAvailabilityForPsychologist(patient.psychologist_id);
      res.json(availability);
    } catch (error) {
      console.error("Error al obtener disponibilidad del psicólogo:", error);
      res.status(500).json({ 
        error: "Error del servidor", 
        message: "No se pudo obtener la disponibilidad del psicólogo"
      });
    }
  });

  // OpenAI integration routes
  app.post("/api/ai/generate-message", isAuthenticated, isPsychologist, async (req, res) => {
    try {
      const params: MessageGenerationParams = req.body;
      // Obtener el nombre del psicólogo si no se proporciona
      if (!params.psychologistName && req.user) {
        params.psychologistName = (req.user as any).full_name;
      }
      
      const message = await generatePersonalizedMessage(params);
      res.json({ message });
    } catch (error) {
      console.error("Error en generación de mensaje:", error);
      res.status(500).json({ message: "Error al generar el mensaje personalizado" });
    }
  });

  app.post("/api/ai/improve-message", isAuthenticated, isPsychologist, async (req, res) => {
    try {
      const { message, instructions } = req.body;
      if (!message || !instructions) {
        return res.status(400).json({ message: "Se requiere un mensaje e instrucciones" });
      }
      
      const improvedMessage = await improveMessage(message, instructions);
      res.json({ message: improvedMessage });
    } catch (error) {
      console.error("Error al mejorar mensaje:", error);
      res.status(500).json({ message: "Error al mejorar el mensaje" });
    }
  });

  app.post("/api/ai/suggest-title", isAuthenticated, isPsychologist, async (req, res) => {
    try {
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ message: "Se requiere el contenido del mensaje" });
      }
      
      const title = await suggestMessageTemplateTitle(content);
      res.json({ title });
    } catch (error) {
      console.error("Error al sugerir título:", error);
      res.status(500).json({ message: "Error al sugerir un título para la plantilla" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
