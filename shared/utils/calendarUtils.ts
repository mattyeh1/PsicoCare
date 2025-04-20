import { Appointment, Patient } from '../schema';

/**
 * Generates an RFC5545 compliant iCalendar file content for a given appointment
 * 
 * @param appointment The appointment data
 * @param patient The patient data
 * @param psychologistName The name of the psychologist
 * @returns A string containing the ICS file content
 */
export function generateICalendarEvent(
  appointment: Appointment, 
  patient: Patient, 
  psychologistName: string
): string {
  // Generate a unique ID for the event (RFC5545 compliant)
  const eventUid = `appointment-${appointment.id}@psytherapist.app`;

  // Format start and end dates to UTC format required by ICS
  const startDate = new Date(appointment.date);
  const endDate = new Date(startDate.getTime() + appointment.duration * 60000);
  
  // Format date to YYYYMMDDTHHMMSSZ format
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d+/g, '');
  };

  // Create event description
  const description = appointment.notes 
    ? `Cita con ${patient.name}. Notas: ${appointment.notes}`
    : `Cita con ${patient.name}`;

  // Create location (video URL if available)
  const location = appointment.video_url 
    ? appointment.video_url 
    : "Consulta online";

  // Generate ICS content
  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PsyTherapist//Appointment Calendar//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${eventUid}`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:Cita con ${psychologistName}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return icsContent;
}

/**
 * Generates a Google Calendar event URL for a given appointment
 * 
 * @param appointment The appointment data
 * @param patient The patient data
 * @param psychologistName The name of the psychologist
 * @returns A URL for adding the event to Google Calendar
 */
export function generateGoogleCalendarUrl(
  appointment: Appointment, 
  patient: Patient, 
  psychologistName: string
): string {
  const startDate = new Date(appointment.date);
  const endDate = new Date(startDate.getTime() + appointment.duration * 60000);
  
  // Format dates for Google Calendar URL
  const formatGoogleDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d+/g, '');
  };

  // Create event details
  const title = encodeURIComponent(`Cita con ${psychologistName}`);
  const description = appointment.notes 
    ? encodeURIComponent(`Cita con ${patient.name}. Notas: ${appointment.notes}`)
    : encodeURIComponent(`Cita con ${patient.name}`);
  
  const location = appointment.video_url 
    ? encodeURIComponent(appointment.video_url) 
    : encodeURIComponent("Consulta online");
  
  // Generate Google Calendar URL
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}&details=${description}&location=${location}&sf=true&output=xml`;
}

/**
 * Generates an Outlook.com calendar event URL for a given appointment
 * 
 * @param appointment The appointment data
 * @param patient The patient data
 * @param psychologistName The name of the psychologist
 * @returns A URL for adding the event to Outlook.com Calendar
 */
export function generateOutlookCalendarUrl(
  appointment: Appointment, 
  patient: Patient, 
  psychologistName: string
): string {
  const startDate = new Date(appointment.date);
  const endDate = new Date(startDate.getTime() + appointment.duration * 60000);
  
  // Format dates for Outlook Calendar URL
  const formatOutlookDate = (date: Date): string => {
    return date.toISOString();
  };

  // Create event details
  const title = encodeURIComponent(`Cita con ${psychologistName}`);
  const description = appointment.notes 
    ? encodeURIComponent(`Cita con ${patient.name}. Notas: ${appointment.notes}`)
    : encodeURIComponent(`Cita con ${patient.name}`);
  
  const location = appointment.video_url 
    ? encodeURIComponent(appointment.video_url) 
    : encodeURIComponent("Consulta online");
  
  // Generate Outlook.com Calendar URL
  return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${formatOutlookDate(startDate)}&enddt=${formatOutlookDate(endDate)}&body=${description}&location=${location}`;
}

/**
 * Generates a Yahoo calendar event URL for a given appointment
 * 
 * @param appointment The appointment data
 * @param patient The patient data
 * @param psychologistName The name of the psychologist
 * @returns A URL for adding the event to Yahoo Calendar
 */
export function generateYahooCalendarUrl(
  appointment: Appointment, 
  patient: Patient, 
  psychologistName: string
): string {
  const startDate = new Date(appointment.date);
  const endDate = new Date(startDate.getTime() + appointment.duration * 60000);
  
  // Format dates for Yahoo Calendar URL
  const formatYahooDate = (date: Date): string => {
    return date.toISOString().replace(/-|:|\.\d+/g, '');
  };

  const duration = Math.ceil(appointment.duration / 60); // Duration in hours

  // Create event details
  const title = encodeURIComponent(`Cita con ${psychologistName}`);
  const description = appointment.notes 
    ? encodeURIComponent(`Cita con ${patient.name}. Notas: ${appointment.notes}`)
    : encodeURIComponent(`Cita con ${patient.name}`);
  
  const location = appointment.video_url 
    ? encodeURIComponent(appointment.video_url) 
    : encodeURIComponent("Consulta online");
  
  // Generate Yahoo Calendar URL
  return `https://calendar.yahoo.com/?v=60&title=${title}&st=${formatYahooDate(startDate)}&et=${formatYahooDate(endDate)}&desc=${description}&in_loc=${location}`;
}