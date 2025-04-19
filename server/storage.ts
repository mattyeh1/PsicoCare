import { 
  users, User, InsertUser,
  patients, Patient, InsertPatient,
  appointments, Appointment, InsertAppointment,
  availability, Availability, InsertAvailability,
  message_templates, MessageTemplate, InsertMessageTemplate,
  consent_forms, ConsentForm, InsertConsentForm,
  patient_consents, PatientConsent, InsertPatientConsent,
  contact_requests, ContactRequest, InsertContactRequest
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { db } from "./db";
import { eq } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

export interface IStorage {
  // Session store
  sessionStore: session.Store;
  
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  
  // Patient methods
  getPatient(id: number): Promise<Patient | undefined>;
  getPatientsForPsychologist(psychologistId: number): Promise<Patient[]>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, patient: Partial<InsertPatient>): Promise<Patient>;
  
  // Appointment methods
  getAppointment(id: number): Promise<Appointment | undefined>;
  getAppointmentsForPsychologist(psychologistId: number): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, appointment: Partial<InsertAppointment>): Promise<Appointment>;
  
  // Availability methods
  getAvailability(id: number): Promise<Availability | undefined>;
  getAvailabilityForPsychologist(psychologistId: number): Promise<Availability[]>;
  createAvailability(availability: InsertAvailability): Promise<Availability>;
  deleteAvailability(id: number): Promise<void>;
  
  // Message template methods
  getMessageTemplate(id: number): Promise<MessageTemplate | undefined>;
  getMessageTemplatesForPsychologist(psychologistId: number): Promise<MessageTemplate[]>;
  createMessageTemplate(template: InsertMessageTemplate): Promise<MessageTemplate>;
  
  // Consent form methods
  getConsentForm(id: number): Promise<ConsentForm | undefined>;
  getConsentFormsForPsychologist(psychologistId: number): Promise<ConsentForm[]>;
  createConsentForm(form: InsertConsentForm): Promise<ConsentForm>;
  
  // Patient consent methods
  getPatientConsent(id: number): Promise<PatientConsent | undefined>;
  getPatientConsentsForPsychologist(psychologistId: number): Promise<PatientConsent[]>;
  createPatientConsent(consent: InsertPatientConsent): Promise<PatientConsent>;
  
  // Contact request methods
  createContactRequest(request: InsertContactRequest): Promise<ContactRequest>;
}

const MemoryStore = createMemoryStore(session);

export class MemStorage implements IStorage {
  sessionStore: session.Store;
  
  private users: Map<number, User>;
  private patients: Map<number, Patient>;
  private appointments: Map<number, Appointment>;
  private availabilitySlots: Map<number, Availability>;
  private messageTemplates: Map<number, MessageTemplate>;
  private consentForms: Map<number, ConsentForm>;
  private patientConsents: Map<number, PatientConsent>;
  private contactRequests: Map<number, ContactRequest>;
  
  private userIdCounter: number;
  private patientIdCounter: number;
  private appointmentIdCounter: number;
  private availabilityIdCounter: number;
  private messageTemplateIdCounter: number;
  private consentFormIdCounter: number;
  private patientConsentIdCounter: number;
  private contactRequestIdCounter: number;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    this.users = new Map();
    this.patients = new Map();
    this.appointments = new Map();
    this.availabilitySlots = new Map();
    this.messageTemplates = new Map();
    this.consentForms = new Map();
    this.patientConsents = new Map();
    this.contactRequests = new Map();
    
    this.userIdCounter = 1;
    this.patientIdCounter = 1;
    this.appointmentIdCounter = 1;
    this.availabilityIdCounter = 1;
    this.messageTemplateIdCounter = 1;
    this.consentFormIdCounter = 1;
    this.patientConsentIdCounter = 1;
    this.contactRequestIdCounter = 1;
    
    // Add sample data for development
    this.setupSampleData();
  }

  private setupSampleData() {
    // Sample user
    this.createUser({
      username: "doctor",
      password: "password",
      email: "doctor@example.com",
      full_name: "Dr. Ana Martínez",
      specialty: "Psicología Clínica",
      bio: "Especializada en terapia cognitivo-conductual con más de 10 años de experiencia.",
      education: "Doctorado en Psicología Clínica - Universidad de Buenos Aires",
      certifications: "Maestría en Neuropsicología, Certificación en Terapia EMDR",
      profile_image: "https://images.unsplash.com/photo-1544717305-2782549b5136?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
    });
    
    // Sample message templates
    this.createMessageTemplate({
      psychologist_id: 1,
      type: 'appointment_reminder',
      title: 'Recordatorio de Cita',
      content: 'Estimado(a) [nombre_paciente], le recuerdo que tiene una cita programada para el [fecha_cita] a las [hora_cita]. Por favor, confirme su asistencia. Saludos cordiales, [nombre_doctor].'
    });
    
    this.createMessageTemplate({
      psychologist_id: 1,
      type: 'welcome',
      title: 'Bienvenida',
      content: 'Estimado(a) [nombre_paciente], bienvenido(a) a mi consulta. Estoy aquí para ayudarle en su proceso terapéutico. Si tiene alguna pregunta o inquietud, no dude en contactarme. Saludos cordiales, [nombre_doctor].'
    });
    
    // Sample consent form
    this.createConsentForm({
      psychologist_id: 1,
      title: 'Consentimiento Informado para Terapia',
      content: 'Por medio del presente documento, doy mi consentimiento para recibir servicios de psicoterapia con el Dr./Dra. [nombre_doctor]. Entiendo que la terapia implica un compromiso de tiempo, energía y recursos financieros. Me comprometo a asistir a las sesiones programadas y avisaré con 24 horas de anticipación si necesito cancelar o reprogramar.'
    });
    
    // Sample availability
    for (let day = 1; day <= 5; day++) {
      this.createAvailability({
        psychologist_id: 1,
        day_of_week: day,
        start_time: '09:00',
        end_time: '18:00'
      });
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const newUser: User = { 
      ...user, 
      id,
      bio: user.bio || null,
      education: user.education || null,
      certifications: user.certifications || null,
      profile_image: user.profile_image || null
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      throw new Error("User not found");
    }
    
    const updatedUser: User = { ...existingUser, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Patient methods
  async getPatient(id: number): Promise<Patient | undefined> {
    return this.patients.get(id);
  }

  async getPatientsForPsychologist(psychologistId: number): Promise<Patient[]> {
    return Array.from(this.patients.values()).filter(
      patient => patient.psychologist_id === psychologistId
    );
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const id = this.patientIdCounter++;
    const newPatient: Patient = { 
      ...patient, 
      id,
      phone: patient.phone || null,
      notes: patient.notes || null
    };
    this.patients.set(id, newPatient);
    return newPatient;
  }

  async updatePatient(id: number, patientData: Partial<InsertPatient>): Promise<Patient> {
    const existingPatient = this.patients.get(id);
    if (!existingPatient) {
      throw new Error("Patient not found");
    }
    
    const updatedPatient: Patient = { ...existingPatient, ...patientData };
    this.patients.set(id, updatedPatient);
    return updatedPatient;
  }

  // Appointment methods
  async getAppointment(id: number): Promise<Appointment | undefined> {
    return this.appointments.get(id);
  }

  async getAppointmentsForPsychologist(psychologistId: number): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).filter(
      appointment => appointment.psychologist_id === psychologistId
    );
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const id = this.appointmentIdCounter++;
    const newAppointment: Appointment = { 
      ...appointment, 
      id,
      status: appointment.status || "scheduled",
      notes: appointment.notes || null
    };
    this.appointments.set(id, newAppointment);
    return newAppointment;
  }

  async updateAppointment(id: number, appointmentData: Partial<InsertAppointment>): Promise<Appointment> {
    const existingAppointment = this.appointments.get(id);
    if (!existingAppointment) {
      throw new Error("Appointment not found");
    }
    
    const updatedAppointment: Appointment = { ...existingAppointment, ...appointmentData };
    this.appointments.set(id, updatedAppointment);
    return updatedAppointment;
  }

  // Availability methods
  async getAvailability(id: number): Promise<Availability | undefined> {
    return this.availabilitySlots.get(id);
  }

  async getAvailabilityForPsychologist(psychologistId: number): Promise<Availability[]> {
    return Array.from(this.availabilitySlots.values()).filter(
      availability => availability.psychologist_id === psychologistId
    );
  }

  async createAvailability(availabilityData: InsertAvailability): Promise<Availability> {
    const id = this.availabilityIdCounter++;
    const newAvailability: Availability = { ...availabilityData, id };
    this.availabilitySlots.set(id, newAvailability);
    return newAvailability;
  }

  async deleteAvailability(id: number): Promise<void> {
    this.availabilitySlots.delete(id);
  }

  // Message template methods
  async getMessageTemplate(id: number): Promise<MessageTemplate | undefined> {
    return this.messageTemplates.get(id);
  }

  async getMessageTemplatesForPsychologist(psychologistId: number): Promise<MessageTemplate[]> {
    return Array.from(this.messageTemplates.values()).filter(
      template => template.psychologist_id === psychologistId
    );
  }

  async createMessageTemplate(template: InsertMessageTemplate): Promise<MessageTemplate> {
    const id = this.messageTemplateIdCounter++;
    const newTemplate: MessageTemplate = { ...template, id };
    this.messageTemplates.set(id, newTemplate);
    return newTemplate;
  }

  // Consent form methods
  async getConsentForm(id: number): Promise<ConsentForm | undefined> {
    return this.consentForms.get(id);
  }

  async getConsentFormsForPsychologist(psychologistId: number): Promise<ConsentForm[]> {
    return Array.from(this.consentForms.values()).filter(
      form => form.psychologist_id === psychologistId
    );
  }

  async createConsentForm(form: InsertConsentForm): Promise<ConsentForm> {
    const id = this.consentFormIdCounter++;
    const newForm: ConsentForm = { ...form, id };
    this.consentForms.set(id, newForm);
    return newForm;
  }

  // Patient consent methods
  async getPatientConsent(id: number): Promise<PatientConsent | undefined> {
    return this.patientConsents.get(id);
  }

  async getPatientConsentsForPsychologist(psychologistId: number): Promise<PatientConsent[]> {
    // This is more complex as we need to join patients with their consents
    const psychologistPatients = await this.getPatientsForPsychologist(psychologistId);
    const patientIds = psychologistPatients.map(patient => patient.id);
    
    return Array.from(this.patientConsents.values()).filter(
      consent => patientIds.includes(consent.patient_id)
    );
  }

  async createPatientConsent(consent: InsertPatientConsent): Promise<PatientConsent> {
    const id = this.patientConsentIdCounter++;
    const newConsent: PatientConsent = { ...consent, id };
    this.patientConsents.set(id, newConsent);
    return newConsent;
  }

  // Contact request methods
  async createContactRequest(request: InsertContactRequest): Promise<ContactRequest> {
    const id = this.contactRequestIdCounter++;
    const newRequest: ContactRequest = { 
      ...request, 
      id, 
      created_at: new Date(),
      message: request.message || null
    };
    this.contactRequests.set(id, newRequest);
    return newRequest;
  }
}

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    const PostgresStore = new PostgresSessionStore({ 
      pool,
      tableName: 'session',
      createTableIfMissing: true 
    });
    
    // Asegurarse de que la tabla de sesiones se crea
    this.sessionStore = PostgresStore;
  }

  // Cache para mejorar el rendimiento
  private userCache = new Map<number, User & { cacheTime: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos en milisegundos
  
  // Cache para pacientes
  private patientCache = new Map<number, { data: Patient, timestamp: number }>();
  private readonly PATIENT_CACHE_TTL = 5 * 60 * 1000; // 5 minutos en ms

  async getUser(id: number): Promise<User | undefined> {
    // Verificar si el usuario está en caché y si la caché sigue siendo válida
    const cachedUser = this.userCache.get(id);
    const now = Date.now();
    
    if (cachedUser && (now - cachedUser.cacheTime < this.CACHE_TTL)) {
      // Usar caché si es válida
      const { cacheTime, ...user } = cachedUser;
      return user;
    }
    
    // Si no está en caché o expiró, consulta la base de datos
    const [user] = await db.select().from(users).where(eq(users.id, id));
    
    if (user) {
      // Guardar en caché
      this.userCache.set(id, { ...user, cacheTime: now });
    }
    
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    
    if (user) {
      // Actualizar caché si se encuentra el usuario
      this.userCache.set(user.id, { ...user, cacheTime: Date.now() });
    }
    
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    // Asegúrate de que los valores predeterminados estén establecidos
    const userWithDefaults = {
      ...user,
      created_at: new Date(),
      updated_at: new Date(),
      account_status: "active",
      timezone: "UTC",
      language_preference: "es"
    };
    
    const [newUser] = await db.insert(users).values(userWithDefaults).returning();
    
    // Actualizar caché
    this.userCache.set(newUser.id, { ...newUser, cacheTime: Date.now() });
    
    return newUser;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User> {
    // Asegúrate de actualizar la marca de tiempo
    const updateData = {
      ...userData,
      updated_at: new Date()
    };
    
    const [updatedUser] = await db.update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    
    // Actualizar caché
    if (updatedUser) {
      this.userCache.set(updatedUser.id, { ...updatedUser, cacheTime: Date.now() });
    }
    
    return updatedUser;
  }
  
  // Método para registrar el inicio de sesión
  async recordUserLogin(id: number): Promise<void> {
    await db.update(users)
      .set({ last_login: new Date() })
      .where(eq(users.id, id));
      
    // Invalidar caché para este usuario
    this.userCache.delete(id);
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    // Verificar caché
    const cached = this.patientCache.get(id);
    if (cached && (Date.now() - cached.timestamp < this.PATIENT_CACHE_TTL)) {
      return cached.data;
    }
    
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    
    if (patient) {
      this.patientCache.set(id, {
        data: patient,
        timestamp: Date.now()
      });
    }
    
    return patient;
  }

  async getPatientsForPsychologist(psychologistId: number): Promise<Patient[]> {
    // Usar índices para optimizar la búsqueda
    const results = await db.select()
      .from(patients)
      .where(eq(patients.psychologist_id, psychologistId))
      .orderBy(patients.name);
      
    // Actualizar caché para cada paciente
    results.forEach(patient => {
      this.patientCache.set(patient.id, {
        data: patient,
        timestamp: Date.now()
      });
    });
    
    return results;
  }

  // Las declaraciones de caché ya están arriba, eliminamos la duplicación

  async createPatient(patient: InsertPatient): Promise<Patient> {
    // Añadir campos predeterminados para el nuevo esquema
    const patientWithDefaults = {
      ...patient,
      created_at: new Date(),
      updated_at: new Date(),
      date_of_birth: null,
      address: null,
      emergency_contact: null,
      status: "active"
    };
    
    const [newPatient] = await db.insert(patients).values(patientWithDefaults).returning();
    
    // Actualizar caché
    this.patientCache.set(newPatient.id, { 
      data: newPatient, 
      timestamp: Date.now() 
    });
    
    return newPatient;
  }

  async updatePatient(id: number, patientData: Partial<InsertPatient>): Promise<Patient> {
    // Siempre actualizar la marca de tiempo
    const updateData = {
      ...patientData,
      updated_at: new Date()
    };
    
    const [updatedPatient] = await db.update(patients)
      .set(updateData)
      .where(eq(patients.id, id))
      .returning();
    
    // Actualizar caché
    if (updatedPatient) {
      this.patientCache.set(updatedPatient.id, { 
        data: updatedPatient, 
        timestamp: Date.now() 
      });
    }
    
    return updatedPatient;
  }

  // Cache para citas (ya declarada arriba)
  private appointmentCache = new Map<number, { data: Appointment, timestamp: number }>();
  private readonly APPOINTMENT_CACHE_TTL = 2 * 60 * 1000; // 2 minutos en ms

  async getAppointment(id: number): Promise<Appointment | undefined> {
    // Verificar caché
    const cached = this.appointmentCache.get(id);
    if (cached && (Date.now() - cached.timestamp < this.APPOINTMENT_CACHE_TTL)) {
      return cached.data;
    }
    
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    
    if (appointment) {
      this.appointmentCache.set(id, {
        data: appointment,
        timestamp: Date.now()
      });
    }
    
    return appointment;
  }

  async getAppointmentsForPsychologist(psychologistId: number): Promise<Appointment[]> {
    // Para citas, usamos índices para optimizar la búsqueda por psicólogo y fecha
    const results = await db.select()
      .from(appointments)
      .where(eq(appointments.psychologist_id, psychologistId))
      .orderBy(appointments.date);
      
    // Actualizar caché para cada cita
    results.forEach(appointment => {
      this.appointmentCache.set(appointment.id, {
        data: appointment,
        timestamp: Date.now()
      });
    });
    
    return results;
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    // Añadir campos predeterminados para el nuevo esquema
    const appointmentWithDefaults = {
      ...appointment,
      created_at: new Date(),
      updated_at: new Date(),
      video_url: null,
      reminder_sent: false,
      payment_status: "pending",
      meeting_type: "video"
    };
    
    const [newAppointment] = await db.insert(appointments)
      .values(appointmentWithDefaults)
      .returning();
    
    // Actualizar caché
    this.appointmentCache.set(newAppointment.id, {
      data: newAppointment,
      timestamp: Date.now()
    });
    
    return newAppointment;
  }

  async updateAppointment(id: number, appointmentData: Partial<InsertAppointment>): Promise<Appointment> {
    // Siempre actualizar la marca de tiempo
    const updateData = {
      ...appointmentData,
      updated_at: new Date()
    };
    
    const [updatedAppointment] = await db.update(appointments)
      .set(updateData)
      .where(eq(appointments.id, id))
      .returning();
    
    // Actualizar caché y notificar cambios
    if (updatedAppointment) {
      this.appointmentCache.set(updatedAppointment.id, {
        data: updatedAppointment,
        timestamp: Date.now()
      });
    }
    
    return updatedAppointment;
  }

  async getAvailability(id: number): Promise<Availability | undefined> {
    const [availabilitySlot] = await db.select().from(availability).where(eq(availability.id, id));
    return availabilitySlot;
  }

  async getAvailabilityForPsychologist(psychologistId: number): Promise<Availability[]> {
    return db.select()
      .from(availability)
      .where(eq(availability.psychologist_id, psychologistId));
  }

  async createAvailability(availabilityData: InsertAvailability): Promise<Availability> {
    const [newAvailability] = await db.insert(availability).values(availabilityData).returning();
    return newAvailability;
  }

  async deleteAvailability(id: number): Promise<void> {
    await db.delete(availability).where(eq(availability.id, id));
  }

  async getMessageTemplate(id: number): Promise<MessageTemplate | undefined> {
    const [template] = await db.select().from(message_templates).where(eq(message_templates.id, id));
    return template;
  }

  async getMessageTemplatesForPsychologist(psychologistId: number): Promise<MessageTemplate[]> {
    return db.select()
      .from(message_templates)
      .where(eq(message_templates.psychologist_id, psychologistId));
  }

  async createMessageTemplate(template: InsertMessageTemplate): Promise<MessageTemplate> {
    const [newTemplate] = await db.insert(message_templates).values(template).returning();
    return newTemplate;
  }

  async getConsentForm(id: number): Promise<ConsentForm | undefined> {
    const [form] = await db.select().from(consent_forms).where(eq(consent_forms.id, id));
    return form;
  }

  async getConsentFormsForPsychologist(psychologistId: number): Promise<ConsentForm[]> {
    return db.select()
      .from(consent_forms)
      .where(eq(consent_forms.psychologist_id, psychologistId));
  }

  async createConsentForm(form: InsertConsentForm): Promise<ConsentForm> {
    const [newForm] = await db.insert(consent_forms).values(form).returning();
    return newForm;
  }

  async getPatientConsent(id: number): Promise<PatientConsent | undefined> {
    const [consent] = await db.select().from(patient_consents).where(eq(patient_consents.id, id));
    return consent;
  }

  async getPatientConsentsForPsychologist(psychologistId: number): Promise<PatientConsent[]> {
    // Join with patients to filter by psychologist_id
    const result = await db.select()
      .from(patient_consents)
      .innerJoin(patients, eq(patient_consents.patient_id, patients.id))
      .where(eq(patients.psychologist_id, psychologistId));
    
    // Transform join result to return only patient_consents
    return result.map(row => row.patient_consents);
  }

  async createPatientConsent(consent: InsertPatientConsent): Promise<PatientConsent> {
    const [newConsent] = await db.insert(patient_consents).values(consent).returning();
    return newConsent;
  }

  async createContactRequest(request: InsertContactRequest): Promise<ContactRequest> {
    // created_at will be handled by the database default value
    const [newRequest] = await db.insert(contact_requests).values(request).returning();
    return newRequest;
  }
}

export const storage = new DatabaseStorage();