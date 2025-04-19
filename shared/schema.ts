import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enum for appointment status
export const appointmentStatusEnum = pgEnum('appointment_status', ['scheduled', 'completed', 'cancelled', 'missed']);

// Enum for message templates
export const messageTypeEnum = pgEnum('message_type', ['appointment_reminder', 'follow_up', 'welcome', 'cancellation', 'rescheduling', 'custom']);

// Users table (psychologists)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  full_name: text("full_name").notNull(),
  specialty: text("specialty").notNull(),
  bio: text("bio"),
  education: text("education"),
  certifications: text("certifications"),
  profile_image: text("profile_image"),
});

// Patients table
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  psychologist_id: integer("psychologist_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  notes: text("notes"),
});

// Appointments table
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  psychologist_id: integer("psychologist_id").references(() => users.id).notNull(),
  patient_id: integer("patient_id").references(() => patients.id).notNull(),
  date: timestamp("date").notNull(),
  duration: integer("duration").notNull(), // in minutes
  status: appointmentStatusEnum("status").notNull().default('scheduled'),
  notes: text("notes"),
});

// Availability table
export const availability = pgTable("availability", {
  id: serial("id").primaryKey(),
  psychologist_id: integer("psychologist_id").references(() => users.id).notNull(),
  day_of_week: integer("day_of_week").notNull(), // 0-6 for Sunday-Saturday
  start_time: text("start_time").notNull(), // format: 'HH:MM'
  end_time: text("end_time").notNull(), // format: 'HH:MM'
});

// Message templates table
export const message_templates = pgTable("message_templates", {
  id: serial("id").primaryKey(),
  psychologist_id: integer("psychologist_id").references(() => users.id).notNull(),
  type: messageTypeEnum("type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
});

// Consent forms table
export const consent_forms = pgTable("consent_forms", {
  id: serial("id").primaryKey(),
  psychologist_id: integer("psychologist_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
});

// Patient consent forms
export const patient_consents = pgTable("patient_consents", {
  id: serial("id").primaryKey(),
  patient_id: integer("patient_id").references(() => patients.id).notNull(),
  consent_form_id: integer("consent_form_id").references(() => consent_forms.id).notNull(),
  signed_at: timestamp("signed_at").notNull(),
  signature: text("signature").notNull(),
});

// Contact requests table
export const contact_requests = pgTable("contact_requests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  specialty: text("specialty").notNull(),
  message: text("message"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertPatientSchema = createInsertSchema(patients).omit({ id: true });
export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true });
export const insertAvailabilitySchema = createInsertSchema(availability).omit({ id: true });
export const insertMessageTemplateSchema = createInsertSchema(message_templates).omit({ id: true });
export const insertConsentFormSchema = createInsertSchema(consent_forms).omit({ id: true });
export const insertPatientConsentSchema = createInsertSchema(patient_consents).omit({ id: true });
export const insertContactRequestSchema = createInsertSchema(contact_requests).omit({ id: true, created_at: true });

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

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

export type ContactRequest = typeof contact_requests.$inferSelect;
export type InsertContactRequest = z.infer<typeof insertContactRequestSchema>;
