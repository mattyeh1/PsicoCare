import { Appointment, Patient } from "../schema";

/**
 * Genera un evento en formato iCalendar (RFC5545) para una cita
 * 
 * @param appointment La información de la cita
 * @param patient Los datos del paciente
 * @param psychologistName El nombre del psicólogo
 * @returns Un string con el contenido del archivo ICS
 */
export function generateICalendarEvent(
  appointment: Appointment, 
  patient: Patient, 
  psychologistName: string
): string {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  };
  
  const startDate = new Date(appointment.date);
  const endDate = new Date(startDate.getTime() + appointment.duration * 60000);
  const now = new Date();
  
  // Generamos un UID único para el evento
  const uid = `appointment-${appointment.id}-${Math.random().toString(36).substring(2, 11)}`;
  
  // Construimos la descripción con toda la información relevante
  const description = `Cita con ${patient.name}\n` +
    `Duración: ${appointment.duration} minutos\n` +
    (appointment.notes ? `Notas: ${appointment.notes}\n` : '');
    
  // Creamos el evento en formato iCalendar
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PsiConnect//Citas v1.0//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatDate(now)}`,
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:Cita con ${psychologistName}`,
    `DESCRIPTION:${description.replace(/\n/g, "\\n")}`,
    "STATUS:CONFIRMED",
    `ORGANIZER;CN=${psychologistName}:mailto:noreply@psiconnect.com`,
    `ATTENDEE;CN=${patient.name}:mailto:${patient.email || 'noreply@psiconnect.com'}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
}

/**
 * Genera una URL para añadir el evento a Google Calendar
 * 
 * @param appointment La información de la cita
 * @param patient Los datos del paciente
 * @param psychologistName El nombre del psicólogo
 * @returns Una URL para añadir el evento a Google Calendar
 */
export function generateGoogleCalendarUrl(
  appointment: Appointment, 
  patient: Patient, 
  psychologistName: string
): string {
  const formatGoogleDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "Z");
  };
  
  const startDate = new Date(appointment.date);
  const endDate = new Date(startDate.getTime() + appointment.duration * 60000);
  
  // Construimos la descripción
  const description = `Cita con ${patient.name}\n` +
    `Duración: ${appointment.duration} minutos\n` +
    (appointment.notes ? `Notas: ${appointment.notes}\n` : '');
  
  // Creamos los parámetros para la URL
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Cita con ${psychologistName}`,
    dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
    details: description,
  });
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Genera una URL para añadir el evento a Outlook Calendar
 * 
 * @param appointment La información de la cita
 * @param patient Los datos del paciente
 * @param psychologistName El nombre del psicólogo
 * @returns Una URL para añadir el evento a Outlook Calendar
 */
export function generateOutlookCalendarUrl(
  appointment: Appointment, 
  patient: Patient, 
  psychologistName: string
): string {
  const formatOutlookDate = (date: Date): string => {
    return date.toISOString();
  };
  
  const startDate = new Date(appointment.date);
  const endDate = new Date(startDate.getTime() + appointment.duration * 60000);
  
  // Construimos la descripción
  const description = `Cita con ${patient.name}\n` +
    `Duración: ${appointment.duration} minutos\n` +
    (appointment.notes ? `Notas: ${appointment.notes}\n` : '');
  
  // Creamos los parámetros para la URL
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    startdt: formatOutlookDate(startDate),
    enddt: formatOutlookDate(endDate),
    subject: `Cita con ${psychologistName}`,
    body: description,
  });
  
  return `https://outlook.live.com/calendar/0/${params.toString()}`;
}

/**
 * Genera una URL para añadir el evento a Yahoo Calendar
 * 
 * @param appointment La información de la cita
 * @param patient Los datos del paciente
 * @param psychologistName El nombre del psicólogo
 * @returns Una URL para añadir el evento a Yahoo Calendar
 */
export function generateYahooCalendarUrl(
  appointment: Appointment, 
  patient: Patient, 
  psychologistName: string
): string {
  const formatYahooDate = (date: Date): string => {
    return date.toISOString().replace(/-|:|\.\d{3}/g, "");
  };
  
  const startDate = new Date(appointment.date);
  const endDate = new Date(startDate.getTime() + appointment.duration * 60000);
  
  // Construimos la descripción
  const description = `Cita con ${patient.name}\n` +
    `Duración: ${appointment.duration} minutos\n` +
    (appointment.notes ? `Notas: ${appointment.notes}\n` : '');
  
  // Creamos los parámetros para la URL
  const params = new URLSearchParams({
    v: '60',
    title: `Cita con ${psychologistName}`,
    st: formatYahooDate(startDate),
    et: formatYahooDate(endDate),
    desc: description,
  });
  
  return `https://calendar.yahoo.com/?${params.toString()}`;
}