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
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import MemoryStore from "memorystore";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session store
  const MemoryStoreSession = MemoryStore(session);
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "psiconnect-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: process.env.NODE_ENV === "production", maxAge: 24 * 60 * 60 * 1000 },
      store: new MemoryStoreSession({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
    })
  );

  // Setup passport
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }
        
        // In a real app, you would hash and compare passwords
        if (user.password !== password) {
          return done(null, false, { message: "Invalid username or password" });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Authentication middleware
  const isAuthenticated = (req: Request, res: Response, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
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

  // Authentication routes
  app.post("/api/auth/login", passport.authenticate("local"), (req, res) => {
    const user = req.user as any;
    res.json({ message: "Login successful", user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name } });
  });

  app.post("/api/auth/register", validateRequest(insertUserSchema), async (req, res) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const user = await storage.createUser(req.body);
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Error during login after registration" });
        }
        return res.json({ message: "Registration successful", user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name } });
      });
    } catch (error) {
      res.status(500).json({ message: "Error during registration" });
    }
  });

  app.get("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user as any;
      return res.json({ 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        full_name: user.full_name,
        specialty: user.specialty,
        bio: user.bio,
        education: user.education,
        certifications: user.certifications,
        profile_image: user.profile_image
      });
    }
    res.status(401).json({ message: "Not authenticated" });
  });

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
      const patientData = { ...req.body, psychologist_id: userId };
      const patient = await storage.createPatient(patientData);
      res.status(201).json(patient);
    } catch (error) {
      res.status(500).json({ message: "Error creating patient" });
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

  const httpServer = createServer(app);
  return httpServer;
}
