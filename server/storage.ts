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

export interface IStorage {
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

export class MemStorage implements IStorage {
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
    const newUser: User = { ...user, id };
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
    const newPatient: Patient = { ...patient, id };
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
    const newAppointment: Appointment = { ...appointment, id };
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
      created_at: new Date() 
    };
    this.contactRequests.set(id, newRequest);
    return newRequest;
  }
}

export const storage = new MemStorage();
