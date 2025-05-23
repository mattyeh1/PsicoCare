import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
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
  insertMessageSchema,
  users,
  patients,
  appointments,
  availability,
  type InsertAppointment
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { setupAuth, hashPassword } from "./auth";
import { 
  generatePersonalizedMessage, 
  improveMessage, 
  suggestMessageTemplateTitle,
  type MessageGenerationParams 
} from "./services/openai";
import { db } from "./db";
import multer from "multer";
import path from "path";
import fs from "fs";
import { eq } from "drizzle-orm";
import { 
  generateICalendarEvent, 
  generateGoogleCalendarUrl, 
  generateOutlookCalendarUrl, 
  generateYahooCalendarUrl 
} from "@shared/utils/calendarUtils";

export async function registerRoutes(app: Express): Promise<Server> {
  // Asegurarnos de que el directorio uploads existe
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  // Configurar ruta para servir archivos estáticos desde el directorio uploads
  app.use('/uploads', (req, res, next) => {
    // Log de acceso a archivo
    console.log(`Acceso a archivo: ${req.path}`);
    next();
  }, express.static(uploadsDir));
  
  // Configurar multer para guardar archivos en el directorio uploads
  const multerStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
  });
  
  // Crear el middleware de multer con la configuración
  const upload = multer({ 
    storage: multerStorage,
    limits: {
      fileSize: 5 * 1024 * 1024, // Limitar a 5MB
    },
    fileFilter: (req, file, cb) => {
      // Aceptar solo imágenes y PDFs
      const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Tipo de archivo no soportado. Solo se permiten JPG, PNG y PDF.'));
      }
    }
  });
  
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
      console.log(`Consultando pacientes para psicólogo con ID: ${userId}`);
      
      // Utilizamos acceso directo a la base de datos para diagnosticar posibles problemas
      try {
        const results = await db.select()
          .from(patients)
          .where(eq(patients.psychologist_id, userId))
          .orderBy(patients.name);
        
        console.log(`Pacientes encontrados con consulta directa: ${results.length}`);
        res.json(results);
      } catch (dbError) {
        console.error("Error en consulta directa a DB:", dbError);
        // Intentar usar el método del storage como respaldo
        const patients = await storage.getPatientsForPsychologist(userId);
        res.json(patients);
      }
    } catch (error) {
      console.error("Error al obtener pacientes:", error);
      res.status(500).json({ 
        message: "Error fetching patients", 
        error: error instanceof Error ? error.message : String(error)
      });
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
  
  // Ruta para crear usuarios pacientes desde psicólogos
  app.post("/api/register/patient", isAuthenticated, isPsychologist, async (req, res) => {
    try {
      // Validar que sea un psicólogo quien está creando el paciente
      const userId = (req.user as any).id;
      const userType = (req.user as any).user_type;
      
      if (userType !== 'psychologist') {
        return res.status(403).json({ 
          message: "Solo los psicólogos pueden crear cuentas de pacientes" 
        });
      }
      
      console.log("Psicólogo creando cuenta de paciente:", {
        userId,
        patientData: {
          ...req.body,
          password: req.body.password ? '[REDACTED]' : undefined
        }
      });
      
      // Validar los datos básicos
      if (!req.body.username || !req.body.password || !req.body.email || !req.body.full_name) {
        return res.status(400).json({ 
          message: "Faltan datos obligatorios (username, password, email, full_name)" 
        });
      }
      
      // Comprobar si ya existe un usuario con ese nombre de usuario o email
      const existingUserByUsername = await storage.getUserByUsername(req.body.username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: "El nombre de usuario ya está en uso" });
      }
      
      const existingUserByEmail = await storage.getUserByEmail(req.body.email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "El email ya está registrado" });
      }
      
      // Crear el hash de la contraseña
      const hashedPassword = await hashPassword(req.body.password);
      
      // Datos para crear el usuario paciente
      const userData = {
        username: req.body.username,
        password: hashedPassword,
        email: req.body.email,
        full_name: req.body.full_name,
        user_type: 'patient',
        psychologist_id: userId,
        specialty: '' // Campo vacío para pacientes
      };
      
      // Crear el usuario paciente
      const newUser = await storage.createUser(userData);
      console.log("Usuario paciente creado:", newUser.id);
      
      // Crear también la ficha de paciente asociada
      const patientRecord = {
        psychologist_id: userId,
        name: req.body.full_name,
        email: req.body.email,
        phone: req.body.phone || "",
        notes: req.body.notes || ""
      };
      
      // Crear el registro de paciente
      const patient = await storage.createPatient(patientRecord);
      console.log("Ficha de paciente creada:", patient.id);
      
      // Responder con la información del usuario (sin contraseña)
      const { password, ...userWithoutPassword } = newUser;
      
      res.status(201).json({ 
        message: "Cuenta de paciente creada exitosamente",
        user: userWithoutPassword,
        patient: patient
      });
    } catch (error) {
      console.error("Error al crear cuenta de paciente:", error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Datos de paciente inválidos", 
          errors: fromZodError(error).message
        });
      }
      
      res.status(500).json({ 
        message: "Error al crear la cuenta del paciente",
        error: error instanceof Error ? error.message : String(error)
      });
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

  app.post("/api/appointments", isAuthenticated, isPsychologist, upload.single('payment_receipt'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      // Extraer datos del formulario y crear objeto de cita
      const appointmentData: any = {
        patient_id: parseInt(req.body.patient_id),
        psychologist_id: userId,
        date: req.body.date,
        duration: parseInt(req.body.duration),
        status: req.body.status || 'scheduled',
        notes: req.body.notes || null
      };
      
      // Agregar la ruta del archivo si fue subido
      if (req.file) {
        appointmentData.payment_receipt = `/uploads/${req.file.filename}`;
        console.log("Archivo recibido:", req.file);
      }
      
      console.log("Datos de cita a crear:", appointmentData);
      
      // Verificar que el paciente exista y pertenezca a este psicólogo
      const patient = await storage.getPatient(appointmentData.patient_id);
      if (!patient) {
        return res.status(404).json({ message: "Paciente no encontrado" });
      }
      
      if (patient.psychologist_id !== userId) {
        return res.status(403).json({ message: "No tienes permiso para crear citas para este paciente" });
      }
      
      // Validar formato de fecha
      try {
        const date = new Date(appointmentData.date);
        if (isNaN(date.getTime())) {
          return res.status(400).json({ message: "Formato de fecha inválido" });
        }
        appointmentData.date = date;
      } catch (err) {
        return res.status(400).json({ message: "Error en formato de fecha", error: String(err) });
      }
      
      // Crear la cita
      const appointment = await storage.createAppointment(appointmentData);
      console.log("Cita creada:", appointment);
      res.status(201).json(appointment);
    } catch (error) {
      console.error("Error al crear cita:", error);
      res.status(500).json({ 
        message: "Error al crear la cita", 
        error: error instanceof Error ? error.message : String(error) 
      });
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
  
  // Rutas para integración con calendarios externos
  
  // Exportar cita a formato iCalendar (.ics)
  app.get("/api/appointments/:id/ical", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const userType = (req.user as any).user_type;
      const appointmentId = parseInt(req.params.id);
      
      // Obtener la cita
      const appointment = await storage.getAppointment(appointmentId);
      
      if (!appointment) {
        return res.status(404).json({ message: "Cita no encontrada" });
      }
      
      // Verificar permisos de acceso
      if (userType === 'psychologist' && appointment.psychologist_id !== userId) {
        return res.status(403).json({ message: "No estás autorizado para acceder a esta cita" });
      } else if (userType === 'patient') {
        // Verificar que el paciente tenga acceso a esta cita
        const patient = await storage.getPatientByUserId(userId);
        if (!patient || patient.id !== appointment.patient_id) {
          return res.status(403).json({ message: "No estás autorizado para acceder a esta cita" });
        }
      }
      
      // Obtener información del paciente
      const patient = await storage.getPatient(appointment.patient_id);
      if (!patient) {
        return res.status(404).json({ message: "Paciente no encontrado" });
      }
      
      // Obtener información del psicólogo
      const psychologist = await storage.getUser(appointment.psychologist_id);
      if (!psychologist) {
        return res.status(404).json({ message: "Psicólogo no encontrado" });
      }
      
      // Generar el contenido del archivo iCalendar
      const icsContent = generateICalendarEvent(
        appointment, 
        patient, 
        psychologist.full_name
      );
      
      // Configurar la respuesta para descargar el archivo
      res.setHeader('Content-Type', 'text/calendar');
      res.setHeader('Content-Disposition', `attachment; filename="cita-${appointmentId}.ics"`);
      res.send(icsContent);
      
    } catch (error) {
      console.error("Error al exportar cita a iCalendar:", error);
      res.status(500).json({ message: "Error al exportar cita" });
    }
  });

  // Obtener URL para Google Calendar
  app.get("/api/appointments/:id/google-calendar", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const userType = (req.user as any).user_type;
      const appointmentId = parseInt(req.params.id);
      
      // Obtener la cita
      const appointment = await storage.getAppointment(appointmentId);
      
      if (!appointment) {
        return res.status(404).json({ message: "Cita no encontrada" });
      }
      
      // Verificar permisos de acceso
      if (userType === 'psychologist' && appointment.psychologist_id !== userId) {
        return res.status(403).json({ message: "No estás autorizado para acceder a esta cita" });
      } else if (userType === 'patient') {
        // Verificar que el paciente tenga acceso a esta cita
        const patient = await storage.getPatientByUserId(userId);
        if (!patient || patient.id !== appointment.patient_id) {
          return res.status(403).json({ message: "No estás autorizado para acceder a esta cita" });
        }
      }
      
      // Obtener información del paciente
      const patient = await storage.getPatient(appointment.patient_id);
      if (!patient) {
        return res.status(404).json({ message: "Paciente no encontrado" });
      }
      
      // Obtener información del psicólogo
      const psychologist = await storage.getUser(appointment.psychologist_id);
      if (!psychologist) {
        return res.status(404).json({ message: "Psicólogo no encontrado" });
      }
      
      // Generar la URL de Google Calendar
      const googleCalendarUrl = generateGoogleCalendarUrl(
        appointment, 
        patient, 
        psychologist.full_name
      );
      
      res.json({ url: googleCalendarUrl });
      
    } catch (error) {
      console.error("Error al generar URL para Google Calendar:", error);
      res.status(500).json({ message: "Error al generar URL para Google Calendar" });
    }
  });
  
  // Obtener URL para Outlook Calendar
  app.get("/api/appointments/:id/outlook-calendar", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const userType = (req.user as any).user_type;
      const appointmentId = parseInt(req.params.id);
      
      // Obtener la cita
      const appointment = await storage.getAppointment(appointmentId);
      
      if (!appointment) {
        return res.status(404).json({ message: "Cita no encontrada" });
      }
      
      // Verificar permisos de acceso
      if (userType === 'psychologist' && appointment.psychologist_id !== userId) {
        return res.status(403).json({ message: "No estás autorizado para acceder a esta cita" });
      } else if (userType === 'patient') {
        // Verificar que el paciente tenga acceso a esta cita
        const patient = await storage.getPatientByUserId(userId);
        if (!patient || patient.id !== appointment.patient_id) {
          return res.status(403).json({ message: "No estás autorizado para acceder a esta cita" });
        }
      }
      
      // Obtener información del paciente
      const patient = await storage.getPatient(appointment.patient_id);
      if (!patient) {
        return res.status(404).json({ message: "Paciente no encontrado" });
      }
      
      // Obtener información del psicólogo
      const psychologist = await storage.getUser(appointment.psychologist_id);
      if (!psychologist) {
        return res.status(404).json({ message: "Psicólogo no encontrado" });
      }
      
      // Generar la URL de Outlook Calendar
      const outlookCalendarUrl = generateOutlookCalendarUrl(
        appointment, 
        patient, 
        psychologist.full_name
      );
      
      res.json({ url: outlookCalendarUrl });
      
    } catch (error) {
      console.error("Error al generar URL para Outlook Calendar:", error);
      res.status(500).json({ message: "Error al generar URL para Outlook Calendar" });
    }
  });
  
  // Obtener URL para Yahoo Calendar
  app.get("/api/appointments/:id/yahoo-calendar", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const userType = (req.user as any).user_type;
      const appointmentId = parseInt(req.params.id);
      
      // Obtener la cita
      const appointment = await storage.getAppointment(appointmentId);
      
      if (!appointment) {
        return res.status(404).json({ message: "Cita no encontrada" });
      }
      
      // Verificar permisos de acceso
      if (userType === 'psychologist' && appointment.psychologist_id !== userId) {
        return res.status(403).json({ message: "No estás autorizado para acceder a esta cita" });
      } else if (userType === 'patient') {
        // Verificar que el paciente tenga acceso a esta cita
        const patient = await storage.getPatientByUserId(userId);
        if (!patient || patient.id !== appointment.patient_id) {
          return res.status(403).json({ message: "No estás autorizado para acceder a esta cita" });
        }
      }
      
      // Obtener información del paciente
      const patient = await storage.getPatient(appointment.patient_id);
      if (!patient) {
        return res.status(404).json({ message: "Paciente no encontrado" });
      }
      
      // Obtener información del psicólogo
      const psychologist = await storage.getUser(appointment.psychologist_id);
      if (!psychologist) {
        return res.status(404).json({ message: "Psicólogo no encontrado" });
      }
      
      // Generar la URL de Yahoo Calendar
      const yahooCalendarUrl = generateYahooCalendarUrl(
        appointment, 
        patient, 
        psychologist.full_name
      );
      
      res.json({ url: yahooCalendarUrl });
      
    } catch (error) {
      console.error("Error al generar URL para Yahoo Calendar:", error);
      res.status(500).json({ message: "Error al generar URL para Yahoo Calendar" });
    }
  });
  
  // Obtener todas las URLs de calendario para una cita
  app.get("/api/appointments/:id/calendar-links", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const userType = (req.user as any).user_type;
      const appointmentId = parseInt(req.params.id);
      
      // Obtener la cita
      const appointment = await storage.getAppointment(appointmentId);
      
      if (!appointment) {
        return res.status(404).json({ message: "Cita no encontrada" });
      }
      
      // Verificar permisos de acceso
      if (userType === 'psychologist' && appointment.psychologist_id !== userId) {
        return res.status(403).json({ message: "No estás autorizado para acceder a esta cita" });
      } else if (userType === 'patient') {
        // Verificar que el paciente tenga acceso a esta cita
        const patient = await storage.getPatientByUserId(userId);
        if (!patient || patient.id !== appointment.patient_id) {
          return res.status(403).json({ message: "No estás autorizado para acceder a esta cita" });
        }
      }
      
      // Obtener información del paciente
      const patient = await storage.getPatient(appointment.patient_id);
      if (!patient) {
        return res.status(404).json({ message: "Paciente no encontrado" });
      }
      
      // Obtener información del psicólogo
      const psychologist = await storage.getUser(appointment.psychologist_id);
      if (!psychologist) {
        return res.status(404).json({ message: "Psicólogo no encontrado" });
      }
      
      // Generar todas las URLs de calendario
      const icalUrl = `/api/appointments/${appointmentId}/ical`;
      const googleCalendarUrl = generateGoogleCalendarUrl(appointment, patient, psychologist.full_name);
      const outlookCalendarUrl = generateOutlookCalendarUrl(appointment, patient, psychologist.full_name);
      const yahooCalendarUrl = generateYahooCalendarUrl(appointment, patient, psychologist.full_name);
      
      res.json({
        ical: icalUrl,
        google: googleCalendarUrl,
        outlook: outlookCalendarUrl,
        yahoo: yahooCalendarUrl
      });
      
    } catch (error) {
      console.error("Error al generar URLs de calendario:", error);
      res.status(500).json({ message: "Error al generar URLs de calendario" });
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
  app.post("/api/my-appointments", isAuthenticated, upload.single('payment_receipt'), async (req, res) => {
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
      
      // Validar los datos básicos necesarios
      const { date, duration } = req.body;
      if (!date) {
        return res.status(400).json({
          error: "Datos incompletos",
          message: "Se requiere especificar una fecha para la cita"
        });
      }
      
      // Preparar los datos para la cita (con valores por defecto)
      const appointmentData = { 
        date: new Date(date),
        duration: Number(duration) || 60,
        psychologist_id: patient.psychologist_id,
        patient_id: patient.id,
        status: "pending" as const, // Las citas solicitadas por pacientes están pendientes de aprobación
        notes: req.body.notes || null,
        // Añadir la ruta del comprobante de pago si se subió un archivo
        payment_receipt: req.file ? `/uploads/${req.file.filename}` : null
      } as InsertAppointment;
      
      console.log(`Paciente #${userId} solicitando cita con datos:`, appointmentData);
      
      // Crear la cita
      const appointment = await storage.createAppointment(appointmentData);
      
      console.log(`Cita creada correctamente: ID #${appointment.id}`);
      
      res.status(201).json(appointment);
    } catch (error) {
      console.error("Error al crear cita:", error);
      res.status(500).json({ 
        error: "Error del servidor", 
        message: "No se pudo crear la cita. " + (error instanceof Error ? error.message : String(error))
      });
    }
  });

  // Rutas específicas para pacientes
  // Obtener el psicólogo asociado al paciente
  app.get("/api/patient-info", isAuthenticated, async (req, res) => {
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
      
      // Obtener los datos del paciente
      const patient = await storage.getPatientByUserId(userId);
      
      if (!patient) {
        return res.status(404).json({ 
          error: "No encontrado", 
          message: "No se encontró información de paciente asociada a tu cuenta"
        });
      }
      
      // Devolver los datos del paciente
      res.json(patient);
    } catch (error) {
      console.error("Error al obtener información del paciente:", error);
      res.status(500).json({ 
        error: "Error del servidor", 
        message: "No se pudo obtener la información del paciente"
      });
    }
  });
  
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

  // Messages routes
  app.get("/api/messages", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const includeDeleted = req.query.includeDeleted === "true";
      const messages = await storage.getMessagesForUser(userId, includeDeleted);
      res.json(messages);
    } catch (error) {
      console.error("Error al obtener mensajes:", error);
      res.status(500).json({ message: "Error al obtener los mensajes" });
    }
  });

  app.get("/api/messages/sent", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const includeDeleted = req.query.includeDeleted === "true";
      const messages = await storage.getSentMessages(userId, includeDeleted);
      res.json(messages);
    } catch (error) {
      console.error("Error al obtener mensajes enviados:", error);
      res.status(500).json({ message: "Error al obtener los mensajes enviados" });
    }
  });

  app.get("/api/messages/received", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const includeDeleted = req.query.includeDeleted === "true";
      console.log(`[API] Obteniendo mensajes recibidos para usuario #${userId}`);
      
      // Obtener solo mensajes donde el usuario es el DESTINATARIO, no el remitente
      const messages = await storage.getReceivedMessages(userId, includeDeleted);
      
      console.log(`[API] Mensajes recibidos encontrados: ${messages.length}`, messages);
      res.json(messages);
    } catch (error) {
      console.error("Error al obtener mensajes recibidos:", error);
      res.status(500).json({ message: "Error al obtener los mensajes recibidos" });
    }
  });

  app.get("/api/messages/conversation/:userId", isAuthenticated, async (req, res) => {
    try {
      const userOneId = (req.user as any).id;
      const userTwoId = parseInt(req.params.userId, 10);
      
      if (isNaN(userTwoId)) {
        return res.status(400).json({ message: "ID de usuario inválido" });
      }
      
      const conversation = await storage.getConversation(userOneId, userTwoId);
      res.json(conversation);
    } catch (error) {
      console.error("Error al obtener conversación:", error);
      res.status(500).json({ message: "Error al obtener la conversación" });
    }
  });

  app.post("/api/messages", isAuthenticated, validateRequest(insertMessageSchema), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const messageData = {
        ...req.body,
        sender_id: userId
      };
      
      const message = await storage.createMessage(messageData);
      
      // Broadcast the new message via WebSocket if the function is available
      if (typeof (app as any).broadcastMessage === 'function') {
        console.log(`[API] Broadcasting new message (ID: ${message.id}) via WebSocket`);
        (app as any).broadcastMessage(message);
      }
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Error al crear mensaje:", error);
      res.status(500).json({ message: "Error al crear el mensaje" });
    }
  });

  app.patch("/api/messages/:id/read", isAuthenticated, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id, 10);
      
      if (isNaN(messageId)) {
        return res.status(400).json({ message: "ID de mensaje inválido" });
      }
      
      // Verificar que el usuario es el destinatario
      const message = await storage.getMessage(messageId);
      if (!message) {
        return res.status(404).json({ message: "Mensaje no encontrado" });
      }
      
      if (message.recipient_id !== (req.user as any).id) {
        return res.status(403).json({ message: "No estás autorizado para marcar este mensaje como leído" });
      }
      
      const updatedMessage = await storage.markAsRead(messageId);
      res.json(updatedMessage);
    } catch (error) {
      console.error("Error al marcar mensaje como leído:", error);
      res.status(500).json({ message: "Error al marcar el mensaje como leído" });
    }
  });

  app.delete("/api/messages/:id", isAuthenticated, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id, 10);
      const userId = (req.user as any).id;
      
      if (isNaN(messageId)) {
        return res.status(400).json({ message: "ID de mensaje inválido" });
      }
      
      // La función deleteMessage ya verifica que el usuario sea remitente o destinatario
      await storage.deleteMessage(messageId, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error al eliminar mensaje:", error);
      res.status(500).json({ message: "Error al eliminar el mensaje" });
    }
  });

  const httpServer = createServer(app);
  
  // Configure WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store connected clients with their user IDs
  const clients = new Map<WebSocket, { userId?: number; userType?: string }>();

  wss.on('connection', (ws) => {
    console.log('[WebSocket] New connection established');
    clients.set(ws, {});
    
    // Handle authentication message
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle authentication message
        if (data.type === 'auth') {
          console.log(`[WebSocket] Client authenticated: User #${data.userId}, Type: ${data.userType}`);
          clients.set(ws, { 
            userId: data.userId, 
            userType: data.userType 
          });
        }
        
        // Handle client messages - broadcast to relevant recipients
        if (data.type === 'message' && data.messageData) {
          // Broadcast to relevant recipients based on the message data
          broadcastMessage(data.messageData);
        }
      } catch (err) {
        console.error('[WebSocket] Error processing message:', err);
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      console.log('[WebSocket] Client disconnected');
      clients.delete(ws);
    });
    
    // Send initial connection confirmation
    ws.send(JSON.stringify({ type: 'connected' }));
  });
  
  // Function to broadcast messages to relevant users
  function broadcastMessage(messageData: any) {
    // Get sender and recipient IDs
    const senderId = messageData.sender_id;
    const recipientId = messageData.recipient_id;
    
    if (!senderId || !recipientId) {
      console.error('[WebSocket] Invalid message data (missing sender or recipient)');
      return;
    }
    
    console.log(`[WebSocket] Broadcasting message: Sender #${senderId} to Recipient #${recipientId}`);
    
    // Broadcast to connected clients who are either the sender or recipient
    clients.forEach((clientInfo, client) => {
      if (client.readyState === WebSocket.OPEN) {
        const userId = clientInfo.userId;
        
        if (userId === recipientId) {
          // Para el destinatario: notificación completa
          console.log(`[WebSocket] Sending notification to recipient #${userId}`);
          client.send(JSON.stringify({
            type: 'new_message',
            message: {
              id: messageData.id,
              sender_id: senderId,
              recipient_id: recipientId,
              subject: messageData.subject,
              sent_at: messageData.sent_at || new Date(),
              is_notification: true
            }
          }));
        } else if (userId === senderId) {
          // Para el remitente: confirmación de envío sin notificación
          console.log(`[WebSocket] Sending confirmation to sender #${userId}`);
          client.send(JSON.stringify({
            type: 'message_sent',
            message: {
              id: messageData.id,
              sender_id: senderId,
              recipient_id: recipientId,
              subject: messageData.subject,
              sent_at: messageData.sent_at || new Date(),
              is_notification: false
            }
          }));
        }
      }
    });
  }
  
  // Also expose the broadcastMessage function to be used by message creation API
  (app as any).broadcastMessage = broadcastMessage;
  
  // Endpoint para obtener el perfil del usuario actual con otra ruta (para compatibilidad)
  app.get("/api/auth/me", isAuthenticated, (req, res) => {
    // Simplemente retorna el usuario actual sin la contraseña
    const { password, ...userData } = req.user as any;
    res.json(userData);
  });
  
  return httpServer;
}
