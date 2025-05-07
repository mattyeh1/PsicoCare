import { pgTable, text, serial, integer, boolean, timestamp, pgEnum, index, varchar, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enum for appointment status
export const appointmentStatusEnum = pgEnum('appointment_status', ['pending', 'approved', 'scheduled', 'completed', 'cancelled', 'missed', 'rejected']);

// Enum for message templates
export const messageTypeEnum = pgEnum('message_type', ['appointment_reminder', 'follow_up', 'welcome', 'cancellation', 'rescheduling', 'custom']);

// Enumeración para diferenciar tipos de usuarios
export const userTypeEnum = pgEnum('user_type', ['psychologist', 'patient']);

// Users table (psychologists)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  full_name: varchar("full_name", { length: 100 }).notNull(),
  user_type: userTypeEnum("user_type").notNull().default('psychologist'),
  specialty: varchar("specialty", { length: 100 }),
  bio: text("bio"),
  education: text("education"),
  certifications: text("certifications"),
  profile_image: varchar("profile_image", { length: 255 }),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  // Nuevos campos para escalabilidad
  account_status: varchar("account_status", { length: 20 }).default("active").notNull(),
  last_login: timestamp("last_login"),
  timezone: varchar("timezone", { length: 50 }).default("UTC").notNull(),
  language_preference: varchar("language_preference", { length: 10 }).default("es").notNull(),
  // Código único para psicólogos (4 dígitos)
  unique_code: varchar("unique_code", { length: 4 }),
  // Referencia al psicólogo para pacientes
  psychologist_id: integer("psychologist_id").references(() => users.id),
}, (table) => {
  return {
    emailIdx: index("users_email_idx").on(table.email),
    usernameIdx: index("users_username_idx").on(table.username),
    fullNameIdx: index("users_full_name_idx").on(table.full_name),
    specialtyIdx: index("users_specialty_idx").on(table.specialty),
    uniqueCodeIdx: index("users_unique_code_idx").on(table.unique_code),
    psychologistIdIdx: index("users_psychologist_id_idx").on(table.psychologist_id),
    userTypeIdx: index("users_user_type_idx").on(table.user_type),
  };
});

// Patients table
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  psychologist_id: integer("psychologist_id").references(() => users.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  // Nuevos campos para gestión de pacientes a escala
  date_of_birth: date("date_of_birth"),
  address: varchar("address", { length: 255 }),
  emergency_contact: varchar("emergency_contact", { length: 100 }),
  status: varchar("status", { length: 20 }).default("active").notNull(),
}, (table) => {
  return {
    psychologistIdIdx: index("patients_psychologist_id_idx").on(table.psychologist_id),
    emailIdx: index("patients_email_idx").on(table.email),
    nameIdx: index("patients_name_idx").on(table.name),
  };
});

// Appointments table
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  psychologist_id: integer("psychologist_id").references(() => users.id).notNull(),
  patient_id: integer("patient_id").references(() => patients.id).notNull(),
  date: timestamp("date").notNull(),
  duration: integer("duration").notNull(), // in minutes
  status: appointmentStatusEnum("status").notNull().default('pending'),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  // Nuevos campos para escalabilidad de citas
  video_url: varchar("video_url", { length: 255 }),
  reminder_sent: boolean("reminder_sent").default(false),
  payment_status: varchar("payment_status", { length: 20 }).default("pending").notNull(),
  meeting_type: varchar("meeting_type", { length: 20 }).default("video").notNull(),
  // Campo para el comprobante de pago
  payment_receipt: varchar("payment_receipt", { length: 255 }),
}, (table) => {
  return {
    psychologistIdIdx: index("appointments_psychologist_id_idx").on(table.psychologist_id),
    patientIdIdx: index("appointments_patient_id_idx").on(table.patient_id),
    dateIdx: index("appointments_date_idx").on(table.date),
    statusIdx: index("appointments_status_idx").on(table.status),
  };
});

// Availability table
export const availability = pgTable("availability", {
  id: serial("id").primaryKey(),
  psychologist_id: integer("psychologist_id").references(() => users.id).notNull(),
  day_of_week: integer("day_of_week").notNull(), // 0-6 for Sunday-Saturday
  start_time: varchar("start_time", { length: 5 }).notNull(), // format: 'HH:MM'
  end_time: varchar("end_time", { length: 5 }).notNull(), // format: 'HH:MM'
  created_at: timestamp("created_at").defaultNow().notNull(),
  is_recurring: boolean("is_recurring").default(true).notNull(),
  recurrence_end_date: date("recurrence_end_date"),
  is_available: boolean("is_available").default(true).notNull(),
}, (table) => {
  return {
    psychologistIdIdx: index("availability_psychologist_id_idx").on(table.psychologist_id),
    dayOfWeekIdx: index("availability_day_of_week_idx").on(table.day_of_week),
  };
});

// Message templates table
export const message_templates = pgTable("message_templates", {
  id: serial("id").primaryKey(),
  psychologist_id: integer("psychologist_id").references(() => users.id).notNull(),
  type: messageTypeEnum("type").notNull(),
  title: varchar("title", { length: 100 }).notNull(),
  content: text("content").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  is_default: boolean("is_default").default(false).notNull(),
  language: varchar("language", { length: 10 }).default("es").notNull(),
}, (table) => {
  return {
    psychologistIdIdx: index("message_templates_psychologist_id_idx").on(table.psychologist_id),
    typeIdx: index("message_templates_type_idx").on(table.type),
  };
});

// Consent forms table
export const consent_forms = pgTable("consent_forms", {
  id: serial("id").primaryKey(),
  psychologist_id: integer("psychologist_id").references(() => users.id).notNull(),
  title: varchar("title", { length: 100 }).notNull(),
  content: text("content").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  version: varchar("version", { length: 10 }).default("1.0").notNull(),
  is_active: boolean("is_active").default(true).notNull(),
  language: varchar("language", { length: 10 }).default("es").notNull(),
}, (table) => {
  return {
    psychologistIdIdx: index("consent_forms_psychologist_id_idx").on(table.psychologist_id),
  };
});

// Patient consent forms
export const patient_consents = pgTable("patient_consents", {
  id: serial("id").primaryKey(),
  patient_id: integer("patient_id").references(() => patients.id).notNull(),
  consent_form_id: integer("consent_form_id").references(() => consent_forms.id).notNull(),
  signed_at: timestamp("signed_at").notNull(),
  signature: text("signature").notNull(),
  ip_address: varchar("ip_address", { length: 45 }),
  form_version: varchar("form_version", { length: 10 }).notNull(),
  is_valid: boolean("is_valid").default(true).notNull(),
  expires_at: timestamp("expires_at"),
}, (table) => {
  return {
    patientIdIdx: index("patient_consents_patient_id_idx").on(table.patient_id),
    consentFormIdIdx: index("patient_consents_consent_form_id_idx").on(table.consent_form_id),
    signedAtIdx: index("patient_consents_signed_at_idx").on(table.signed_at),
  };
});

// Message table for patient-psychologist communication
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  sender_id: integer("sender_id").notNull().references(() => users.id),
  recipient_id: integer("recipient_id").notNull().references(() => users.id),
  subject: varchar("subject", { length: 200 }).notNull(),
  content: text("content").notNull(),
  sent_at: timestamp("sent_at").defaultNow().notNull(),
  read_at: timestamp("read_at"),
  is_system_message: boolean("is_system_message").default(false).notNull(),
  related_appointment_id: integer("related_appointment_id").references(() => appointments.id),
  parent_message_id: integer("parent_message_id").references(() => messages.id),
  is_deleted_by_sender: boolean("is_deleted_by_sender").default(false).notNull(),
  is_deleted_by_recipient: boolean("is_deleted_by_recipient").default(false).notNull(),
}, (table) => {
  return {
    senderIdx: index("messages_sender_idx").on(table.sender_id),
    recipientIdx: index("messages_recipient_idx").on(table.recipient_id),
    sentAtIdx: index("messages_sent_at_idx").on(table.sent_at),
    appointmentIdx: index("messages_appointment_idx").on(table.related_appointment_id),
  };
});

// Contact requests table
export const contact_requests = pgTable("contact_requests", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 100 }).notNull(),
  specialty: varchar("specialty", { length: 100 }).notNull(),
  message: text("message"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  assigned_to: integer("assigned_to").references(() => users.id),
  phone: varchar("phone", { length: 20 }),
  source: varchar("source", { length: 50 }),
}, (table) => {
  return {
    emailIdx: index("contact_requests_email_idx").on(table.email),
    statusIdx: index("contact_requests_status_idx").on(table.status),
    createdAtIdx: index("contact_requests_created_at_idx").on(table.created_at),
  };
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  created_at: true, 
  updated_at: true, 
  last_login: true, 
  account_status: true,
  timezone: true,
  language_preference: true
});

// Esquema específico para registro de psicólogos
export const insertPsychologistSchema = insertUserSchema.extend({
  user_type: z.literal('psychologist'),
  specialty: z.string().min(3, { message: "La especialidad es obligatoria" })
});

// Esquema específico para registro de pacientes
export const insertPatientUserSchema = insertUserSchema.extend({
  user_type: z.literal('patient'),
  psychologist_code: z.string().length(4, { 
    message: "El código del psicólogo debe tener exactamente 4 dígitos" 
  }),
  specialty: z.string().optional()
});

export const insertPatientSchema = createInsertSchema(patients).omit({ 
  id: true, 
  created_at: true, 
  updated_at: true,
  date_of_birth: true,
  address: true,
  emergency_contact: true,
  status: true
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({ 
  id: true, 
  created_at: true, 
  updated_at: true,
  video_url: true,
  reminder_sent: true,
  payment_status: true,
  meeting_type: true
}).extend({
  // Permitir que date sea tanto string en formato ISO como objeto Date
  date: z.union([
    z.string().transform((date) => new Date(date)),
    z.date()
  ]),
  // Campo opcional para el comprobante de pago
  payment_receipt: z.string().optional()
});

export const insertAvailabilitySchema = createInsertSchema(availability).omit({ 
  id: true, 
  created_at: true,
  is_recurring: true,
  recurrence_end_date: true,
  is_available: true
});

export const insertMessageTemplateSchema = createInsertSchema(message_templates).omit({ 
  id: true, 
  created_at: true, 
  updated_at: true,
  is_default: true,
  language: true
});

export const insertConsentFormSchema = createInsertSchema(consent_forms).omit({ 
  id: true, 
  created_at: true, 
  updated_at: true,
  version: true,
  is_active: true,
  language: true
});

export const insertPatientConsentSchema = createInsertSchema(patient_consents).omit({ 
  id: true,
  ip_address: true,
  is_valid: true,
  expires_at: true
}).extend({
  form_version: z.string().default("1.0"),
  // Permitir que signed_at sea tanto string en formato ISO como objeto Date
  signed_at: z.union([
    z.string().transform((date) => new Date(date)),
    z.date()
  ])
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  sent_at: true,
  read_at: true,
  is_system_message: true,
  is_deleted_by_sender: true,
  is_deleted_by_recipient: true
});

export const insertContactRequestSchema = createInsertSchema(contact_requests).omit({ 
  id: true, 
  created_at: true,
  status: true,
  assigned_to: true,
  phone: true,
  source: true
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertPsychologist = z.infer<typeof insertPsychologistSchema>;
export type InsertPatientUser = z.infer<typeof insertPatientUserSchema>;

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type Availability = typeof availability.$inferSelect;
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;

export type MessageTemplate = typeof message_templates.$inferSelect;
export type InsertMessageTemplate = z.infer<typeof insertMessageTemplateSchema>;

export type ConsentForm = typeof consent_forms.$inferSelect;
export type InsertConsentForm = z.infer<typeof insertConsentFormSchema>;

export type PatientConsent = typeof patient_consents.$inferSelect;
export type InsertPatientConsent = z.infer<typeof insertPatientConsentSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type ContactRequest = typeof contact_requests.$inferSelect;
export type InsertContactRequest = z.infer<typeof insertContactRequestSchema>;
