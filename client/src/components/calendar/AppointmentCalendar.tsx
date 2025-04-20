import { useState, useEffect } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "moment/locale/es";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Card, CardContent } from "@/components/ui/card";
import { Appointment } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Patient } from "@shared/schema";
import CalendarExportMenu from "./CalendarExportMenu";

// Setup the localizer
moment.locale("es");
const localizer = momentLocalizer(moment);

interface AppointmentCalendarProps {
  appointments: Appointment[];
  loading: boolean;
}

const AppointmentCalendar = ({ appointments, loading }: AppointmentCalendarProps) => {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  
  // Fetch patients for patient names
  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  useEffect(() => {
    if (appointments && patients) {
      const formattedEvents = appointments.map(appointment => {
        const patient = patients.find(p => p.id === appointment.patient_id);
        const startDate = new Date(appointment.date);
        const endDate = new Date(startDate.getTime() + appointment.duration * 60000);
        
        // Determine color based on status
        let backgroundColor;
        switch (appointment.status) {
          case 'scheduled':
            backgroundColor = '#4A6FA5'; // primary color
            break;
          case 'completed':
            backgroundColor = '#10B981'; // green
            break;
          case 'cancelled':
            backgroundColor = '#EF4444'; // red
            break;
          case 'missed':
            backgroundColor = '#F59E0B'; // amber
            break;
          default:
            backgroundColor = '#4A6FA5';
        }
        
        return {
          id: appointment.id,
          title: patient ? patient.name : `Paciente ${appointment.patient_id}`,
          start: startDate,
          end: endDate,
          status: appointment.status,
          allDay: false,
          resource: appointment,
          backgroundColor,
          patient: patient,
        };
      });
      
      setEvents(formattedEvents);
    }
  }, [appointments, patients]);

  // Custom event styles
  const eventStyleGetter = (event: any) => {
    const style = {
      backgroundColor: event.backgroundColor,
      borderRadius: '4px',
      opacity: 0.9,
      color: 'white',
      border: '0',
      display: 'block',
      fontSize: '0.8em',
      padding: '2px 5px',
    };
    return {
      style,
    };
  };

  // Custom toolbar for the calendar
  const CustomToolbar = (toolbar: any) => {
    const goToBack = () => {
      toolbar.onNavigate('PREV');
    };
    
    const goToNext = () => {
      toolbar.onNavigate('NEXT');
    };
    
    const goToCurrent = () => {
      toolbar.onNavigate('TODAY');
    };
    
    const label = () => {
      const date = moment(toolbar.date);
      return (
        <span className="font-medium">
          {date.format('MMMM YYYY')}
        </span>
      );
    };
    
    return (
      <div className="flex justify-between items-center mb-4">
        <div>
          <button
            type="button"
            onClick={goToCurrent}
            className="px-3 py-1 bg-white border rounded-md text-sm font-medium hover:bg-gray-50"
          >
            Hoy
          </button>
        </div>
        <div className="flex gap-2 items-center">
          <button
            type="button"
            onClick={goToBack}
            className="p-1 rounded-md hover:bg-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          {label()}
          <button
            type="button"
            onClick={goToNext}
            className="p-1 rounded-md hover:bg-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <div>
          <button
            type="button"
            onClick={() => toolbar.onView('month')}
            className={`px-3 py-1 rounded-md text-sm font-medium mr-1 ${
              toolbar.view === 'month' 
                ? 'bg-primary-500 text-white' 
                : 'bg-white border hover:bg-gray-50'
            }`}
          >
            Mes
          </button>
          <button
            type="button"
            onClick={() => toolbar.onView('week')}
            className={`px-3 py-1 rounded-md text-sm font-medium mr-1 ${
              toolbar.view === 'week' 
                ? 'bg-primary-500 text-white' 
                : 'bg-white border hover:bg-gray-50'
            }`}
          >
            Semana
          </button>
          <button
            type="button"
            onClick={() => toolbar.onView('day')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              toolbar.view === 'day' 
                ? 'bg-primary-500 text-white' 
                : 'bg-white border hover:bg-gray-50'
            }`}
          >
            Día
          </button>
        </div>
      </div>
    );
  };

  // Event details component
  const EventDetails = ({ event }: { event: any }) => {
    return (
      <div className="p-2">
        <strong>{event.title}</strong>
        <p>
          {moment(event.start).format('HH:mm')} - {moment(event.end).format('HH:mm')}
        </p>
        <p>
          Estado: {
            event.status === 'scheduled' ? 'Programada' :
            event.status === 'completed' ? 'Completada' :
            event.status === 'cancelled' ? 'Cancelada' :
            event.status === 'missed' ? 'Ausente' : 'Desconocido'
          }
        </p>
        {event.resource.notes && (
          <p>Notas: {event.resource.notes}</p>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="h-[600px] flex items-center justify-center">Cargando calendario...</div>;
  }

  // Handle event selection
  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event);
  };

  // Handle creating a slot in calendar
  const handleSelectSlot = ({ start }: { start: Date }) => {
    // Navigate to appointments page with date pre-selected
    window.location.href = `/appointments?date=${start.toISOString()}`;
  };

  return (
    <div className="h-[600px]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {events.length} {events.length === 1 ? 'cita' : 'citas'} en total
        </h3>
        <a href="/appointments" className="text-sm text-primary hover:underline">
          Agendar nueva cita
        </a>
      </div>
      
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        eventPropGetter={eventStyleGetter}
        components={{
          toolbar: CustomToolbar,
          event: EventDetails,
        }}
        selectable
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        messages={{
          next: "Siguiente",
          previous: "Anterior",
          today: "Hoy",
          month: "Mes",
          week: "Semana",
          day: "Día",
          agenda: "Agenda",
          date: "Fecha",
          time: "Hora",
          event: "Evento",
          allDay: "Todo el día",
          showMore: (total) => `+ ${total} más`,
        }}
        popup
        views={['month', 'week', 'day']}
        defaultView="week"
      />
      
      {selectedEvent && (
        <div className="mt-4 p-4 border rounded-md bg-muted/20">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium">{selectedEvent.title}</h3>
              <p className="text-sm text-muted-foreground">
                {moment(selectedEvent.start).format('DD/MM/YYYY')} · {moment(selectedEvent.start).format('HH:mm')} - {moment(selectedEvent.end).format('HH:mm')}
              </p>
              <p className="text-sm mt-1">
                Estado: <span className={`px-2 py-1 rounded-full text-xs inline-block ${
                  selectedEvent.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                  selectedEvent.status === 'completed' ? 'bg-green-100 text-green-800' :
                  selectedEvent.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {selectedEvent.status === 'scheduled' ? 'Programada' :
                   selectedEvent.status === 'completed' ? 'Completada' : 
                   selectedEvent.status === 'cancelled' ? 'Cancelada' : 'Ausente'}
                </span>
              </p>
              {selectedEvent.resource.notes && (
                <div className="mt-2">
                  <h4 className="text-sm font-medium">Notas:</h4>
                  <p className="text-sm">{selectedEvent.resource.notes}</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Componente de exportación de calendario */}
              {(selectedEvent.status === 'scheduled' || selectedEvent.status === 'approved') && (
                <CalendarExportMenu appointmentId={selectedEvent.id} buttonStyle="icon" />
              )}
              <a 
                href={`/appointments?appointment=${selectedEvent.id}`} 
                className="text-xs text-primary hover:underline"
              >
                Editar cita
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentCalendar;
