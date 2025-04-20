import type { Express, Request, Response } from "express";
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
  insertContactRequestSchema
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // Authentication middleware with improved session handling
  const isAuthenticated = (req: Request, res: Response, next: any) => {
    // Verify if session is authenticated and user exists
    if (req.isAuthenticated() && req.user && req.user.id) {
      // Update activity timestamp to keep session alive
      if (req.session) {
        req.session.lastActivity = Date.now();
      }
      return next();
    }
    
    // Determine if it's an API request or page request
    const isApiRequest = req.path.startsWith('/api/');
    
    if (isApiRequest) {
      // For API requests, return JSON response
      return res.status(401).json({ 
        error: "No autorizado", 
        message: "La sesión ha expirado o no está autenticada"
      });
    } else {
      // For page requests, redirect to login
      return res.redirect('/login');
    }
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
  app.get("/api/patients", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const patients = await storage.getPatientsForPsychologist(userId);
      res.json(patients);
    } catch (error) {
      res.status(500).json({ message: "Error fetching patients" });
    }
  });

  app.post("/api/patients", isAuthenticated, validateRequest(insertPatientSchema), async (req, res) => {
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

  app.get("/api/patients/:id", isAuthenticated, async (req, res) => {
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
  app.get("/api/appointments", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const appointments = await storage.getAppointmentsForPsychologist(userId);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Error fetching appointments" });
    }
  });

  app.post("/api/appointments", isAuthenticated, validateRequest(insertAppointmentSchema), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const appointmentData = { ...req.body, psychologist_id: userId };
      const appointment = await storage.createAppointment(appointmentData);
      res.status(201).json(appointment);
    } catch (error) {
      res.status(500).json({ message: "Error creating appointment" });
    }
  });

  app.put("/api/appointments/:id", isAuthenticated, validateRequest(insertAppointmentSchema.partial()), async (req, res) => {
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

  // Availability routes
  app.get("/api/availability", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const availabilitySlots = await storage.getAvailabilityForPsychologist(userId);
      res.json(availabilitySlots);
    } catch (error) {
      res.status(500).json({ message: "Error fetching availability" });
    }
  });

  app.post("/api/availability", isAuthenticated, validateRequest(insertAvailabilitySchema), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const availabilityData = { ...req.body, psychologist_id: userId };
      const availability = await storage.createAvailability(availabilityData);
      res.status(201).json(availability);
    } catch (error) {
      res.status(500).json({ message: "Error creating availability" });
    }
  });

  app.delete("/api/availability/:id", isAuthenticated, async (req, res) => {
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
  app.get("/api/message-templates", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const templates = await storage.getMessageTemplatesForPsychologist(userId);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Error fetching message templates" });
    }
  });

  app.post("/api/message-templates", isAuthenticated, validateRequest(insertMessageTemplateSchema), async (req, res) => {
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
  app.get("/api/consent-forms", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const forms = await storage.getConsentFormsForPsychologist(userId);
      res.json(forms);
    } catch (error) {
      res.status(500).json({ message: "Error fetching consent forms" });
    }
  });

  app.post("/api/consent-forms", isAuthenticated, validateRequest(insertConsentFormSchema), async (req, res) => {
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
  app.get("/api/patient-consents", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const patientConsents = await storage.getPatientConsentsForPsychologist(userId);
      res.json(patientConsents);
    } catch (error) {
      res.status(500).json({ message: "Error fetching patient consents" });
    }
  });

  app.post("/api/patient-consents", isAuthenticated, validateRequest(insertPatientConsentSchema), async (req, res) => {
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

  // OpenAI integration routes
  app.post("/api/ai/generate-message", isAuthenticated, async (req, res) => {
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

  app.post("/api/ai/improve-message", isAuthenticated, async (req, res) => {
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

  app.post("/api/ai/suggest-title", isAuthenticated, async (req, res) => {
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
