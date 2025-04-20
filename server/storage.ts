import { 
  users, User, InsertUser,
  patients, Patient, InsertPatient,
  appointments, Appointment, InsertAppointment,
  availability, Availability, InsertAvailability,
  message_templates, MessageTemplate, InsertMessageTemplate,
  consent_forms, ConsentForm, InsertConsentForm,
  patient_consents, PatientConsent, InsertPatientConsent,
  contact_requests, ContactRequest, InsertContactRequest,
  messages, Message, InsertMessage
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { db } from "./db";
import { eq, and, or, not, desc, asc, inArray } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

export interface IStorage {
  // Session store
  sessionStore: session.Store;
  
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUniqueCode(code: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  recordUserLogin(id: number): Promise<void>;
  
  // Patient methods
  getPatient(id: number): Promise<Patient | undefined>;
  getPatientByUserId(userId: number): Promise<Patient | undefined>;
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
  
  // Messages methods
  getMessage(id: number): Promise<Message | undefined>;
  getMessagesForUser(userId: number, includeDeleted?: boolean): Promise<Message[]>;
  getSentMessages(userId: number, includeDeleted?: boolean): Promise<Message[]>;
  getReceivedMessages(userId: number, includeDeleted?: boolean): Promise<Message[]>;
  getConversation(userOneId: number, userTwoId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markAsRead(messageId: number): Promise<Message>;
  deleteMessage(messageId: number, deletedBy: number): Promise<void>;
  
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
  private messages: Map<number, Message>;
  private consentForms: Map<number, ConsentForm>;
  private patientConsents: Map<number, PatientConsent>;
  private contactRequests: Map<number, ContactRequest>;
  
  private userIdCounter: number;
  private patientIdCounter: number;
  private appointmentIdCounter: number;
  private availabilityIdCounter: number;
  private messageTemplateIdCounter: number;
  private messageIdCounter: number;
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
    this.messages = new Map();
    this.consentForms = new Map();
    this.patientConsents = new Map();
    this.contactRequests = new Map();
    
    this.userIdCounter = 1;
    this.patientIdCounter = 1;
    this.appointmentIdCounter = 1;
    this.availabilityIdCounter = 1;
    this.messageTemplateIdCounter = 1;
    this.messageIdCounter = 1;
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
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }
  
  async getUserByUniqueCode(code: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.unique_code === code);
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
  
  async recordUserLogin(id: number): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.last_login = new Date();
      this.users.set(id, user);
    }
  }

  // Patient methods
  async getPatient(id: number): Promise<Patient | undefined> {
    return this.patients.get(id);
  }
  
  async getPatientByUserId(userId: number): Promise<Patient | undefined> {
    // Buscar al paciente asociado con el ID del usuario
    // En la implementación en memoria, podemos simular esta relación
    const user = this.users.get(userId);
    if (!user || user.user_type !== 'patient') {
      return undefined;
    }
    
    // Buscar un paciente que podría estar asociado a este usuario
    // En un sistema real, habría una relación directa entre usuarios pacientes y pacientes
    // Para esta simulación, buscamos un paciente con email similar
    return Array.from(this.patients.values()).find(
      patient => patient.email === user.email
    );
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

  // Messages methods
  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async getMessagesForUser(userId: number, includeDeleted: boolean = false): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(message => {
      if (!includeDeleted && (
        (message.sender_id === userId && message.is_deleted_by_sender) || 
        (message.recipient_id === userId && message.is_deleted_by_recipient)
      )) {
        return false;
      }
      return message.sender_id === userId || message.recipient_id === userId;
    });
  }

  async getSentMessages(userId: number, includeDeleted: boolean = false): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(message => {
      if (!includeDeleted && message.is_deleted_by_sender) {
        return false;
      }
      return message.sender_id === userId;
    });
  }

  async getReceivedMessages(userId: number, includeDeleted: boolean = false): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(message => {
      if (!includeDeleted && message.is_deleted_by_recipient) {
        return false;
      }
      return message.recipient_id === userId;
    });
  }

  async getConversation(userOneId: number, userTwoId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => 
        (message.sender_id === userOneId && message.recipient_id === userTwoId) ||
        (message.sender_id === userTwoId && message.recipient_id === userOneId)
      )
      .filter(message => 
        !(message.sender_id === userOneId && message.is_deleted_by_sender) &&
        !(message.recipient_id === userOneId && message.is_deleted_by_recipient)
      )
      .sort((a, b) => a.sent_at.getTime() - b.sent_at.getTime());
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const id = this.messageIdCounter++;
    const now = new Date();
    
    const newMessage: Message = {
      ...message,
      id,
      sent_at: now,
      read_at: null,
      is_system_message: message.is_system_message || false,
      is_deleted_by_sender: false,
      is_deleted_by_recipient: false
    };
    
    this.messages.set(id, newMessage);
    return newMessage;
  }

  async markAsRead(messageId: number): Promise<Message> {
    const message = this.messages.get(messageId);
    if (!message) {
      throw new Error("Message not found");
    }
    
    const updatedMessage: Message = { ...message, read_at: new Date() };
    this.messages.set(messageId, updatedMessage);
    return updatedMessage;
  }

  async deleteMessage(messageId: number, deletedBy: number): Promise<void> {
    const message = this.messages.get(messageId);
    if (!message) {
      throw new Error("Message not found");
    }
    
    let updatedMessage = { ...message };
    
    if (deletedBy === message.sender_id) {
      updatedMessage.is_deleted_by_sender = true;
    } else if (deletedBy === message.recipient_id) {
      updatedMessage.is_deleted_by_recipient = true;
    } else {
      throw new Error("User is not authorized to delete this message");
    }
    
    this.messages.set(messageId, updatedMessage);
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
      createTableIfMissing: true,
      // Configuración adicional para mejorar el rendimiento y confiabilidad
      ttl: 60 * 60 * 24 * 30, // 30 días en segundos
      pruneSessionInterval: 60 * 15, // Limpiar sesiones expiradas cada 15 minutos
      errorLog: (err) => console.error('Error en PostgresSessionStore:', err)
    });
    
    // Asegurarse de que la tabla de sesiones se crea
    this.sessionStore = PostgresStore;
    
    // Configurar eventos para monitor de sesión
    PostgresStore.on('error', (error) => {
      console.error('Error crítico en almacenamiento de sesiones:', error);
    });
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
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    
    if (user) {
      // Actualizar caché si se encuentra el usuario
      this.userCache.set(user.id, { ...user, cacheTime: Date.now() });
    }
    
    return user;
  }
  
  async getUserByUniqueCode(code: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.unique_code, code));
    
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

  async getPatientByUserId(userId: number): Promise<Patient | undefined> {
    // Primero, obtener los datos del usuario para verificar que es paciente
    const user = await this.getUser(userId);
    if (!user || user.user_type !== 'patient') {
      console.log(`Usuario #${userId} no es de tipo paciente o no existe`);
      return undefined;
    }
    
    console.log(`Buscando paciente para usuario #${userId} con email ${user.email}`);
    
    // Búsqueda por email (principal)
    let results = await db.select()
      .from(patients)
      .where(eq(patients.email, user.email));
    
    // Si no encontramos por email y el usuario tiene psicólogo asignado, intentamos buscar por psicólogo
    if (results.length === 0 && user.psychologist_id) {
      console.log(`No se encontró por email, buscando pacientes del psicólogo #${user.psychologist_id}`);
      
      // Buscar todos los pacientes del psicólogo
      results = await db.select()
        .from(patients)
        .where(eq(patients.psychologist_id, user.psychologist_id));
        
      console.log(`Se encontraron ${results.length} pacientes para el psicólogo #${user.psychologist_id}`);
    }
    
    const patient = results.length > 0 ? results[0] : undefined;
    
    if (patient) {
      console.log(`Paciente encontrado: #${patient.id} - ${patient.name}`);
      // Actualizar caché
      this.patientCache.set(patient.id, {
        data: patient,
        timestamp: Date.now()
      });
    } else {
      console.log(`No se encontró paciente para el usuario #${userId}`);
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

  // Messages methods
  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message;
  }

  async getMessagesForUser(userId: number, includeDeleted: boolean = false): Promise<Message[]> {
    let query = db.select().from(messages).where(
      or(
        eq(messages.sender_id, userId),
        eq(messages.recipient_id, userId)
      )
    );
    
    // Si no queremos incluir los mensajes eliminados por el usuario
    if (!includeDeleted) {
      query = query.where(
        and(
          or(
            not(eq(messages.sender_id, userId)),
            not(eq(messages.is_deleted_by_sender, true))
          ),
          or(
            not(eq(messages.recipient_id, userId)),
            not(eq(messages.is_deleted_by_recipient, true))
          )
        )
      );
    }
    
    return await query.orderBy(desc(messages.sent_at));
  }

  async getSentMessages(userId: number, includeDeleted: boolean = false): Promise<Message[]> {
    let query = db.select().from(messages)
      .where(eq(messages.sender_id, userId));
    
    if (!includeDeleted) {
      query = query.where(eq(messages.is_deleted_by_sender, false));
    }
    
    return await query.orderBy(desc(messages.sent_at));
  }

  async getReceivedMessages(userId: number, includeDeleted: boolean = false): Promise<Message[]> {
    let query = db.select().from(messages)
      .where(eq(messages.recipient_id, userId));
    
    if (!includeDeleted) {
      query = query.where(eq(messages.is_deleted_by_recipient, false));
    }
    
    return await query.orderBy(desc(messages.sent_at));
  }

  async getConversation(userOneId: number, userTwoId: number): Promise<Message[]> {
    const conversation = await db.select().from(messages)
      .where(
        and(
          or(
            and(
              eq(messages.sender_id, userOneId),
              eq(messages.recipient_id, userTwoId),
              eq(messages.is_deleted_by_sender, false)
            ),
            and(
              eq(messages.sender_id, userTwoId),
              eq(messages.recipient_id, userOneId),
              eq(messages.is_deleted_by_recipient, false)
            )
          )
        )
      )
      .orderBy(asc(messages.sent_at));
    
    return conversation;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages)
      .values({
        ...message,
        sent_at: new Date(),
        is_deleted_by_sender: false,
        is_deleted_by_recipient: false,
        is_system_message: message.is_system_message || false
      })
      .returning();
    
    return newMessage;
  }

  async markAsRead(messageId: number): Promise<Message> {
    const [updatedMessage] = await db.update(messages)
      .set({ read_at: new Date() })
      .where(eq(messages.id, messageId))
      .returning();
    
    if (!updatedMessage) {
      throw new Error("Message not found");
    }
    
    return updatedMessage;
  }

  async deleteMessage(messageId: number, deletedBy: number): Promise<void> {
    // Primero obtenemos el mensaje
    const [message] = await db.select().from(messages).where(eq(messages.id, messageId));
    
    if (!message) {
      throw new Error("Message not found");
    }
    
    // Verificamos los permisos y actualizamos el campo correcto
    if (deletedBy === message.sender_id) {
      await db.update(messages)
        .set({ is_deleted_by_sender: true })
        .where(eq(messages.id, messageId));
    } else if (deletedBy === message.recipient_id) {
      await db.update(messages)
        .set({ is_deleted_by_recipient: true })
        .where(eq(messages.id, messageId));
    } else {
      throw new Error("User is not authorized to delete this message");
    }
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