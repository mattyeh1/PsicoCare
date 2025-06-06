import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Calendar, 
  Clock, 
  FileText, 
  Loader2, 
  MessageSquare, 
  UserCircle 
} from 'lucide-react';

import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PatientDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Obtener información del psicólogo asignado
  const { data: psychologist, isLoading: isPsychologistLoading } = useQuery({
    queryKey: ['/api/my-psychologist'],
    enabled: !!user && user.user_type === 'patient',
  });
  
  // Obtener disponibilidad del psicólogo
  const { data: availability } = useQuery({
    queryKey: ['/api/my-psychologist/availability'],
    enabled: !!user && user.user_type === 'patient',
  });
  
  // Obtener citas del paciente
  const appointmentsQuery = useQuery({
    queryKey: ['/api/my-appointments'],
    enabled: !!user && user.user_type === 'patient',
  });
  
  const { data: appointments, isLoading: isAppointmentsLoading } = appointmentsQuery;
  
  // Función para notificar cuando una característica no está disponible
  const notifyFeatureNotAvailable = () => {
    toast({
      title: "Característica en desarrollo",
      description: "Esta funcionalidad estará disponible próximamente.",
      duration: 3000,
    });
  };
  
  // Manejar la solicitud de una nueva cita
  const handleRequestAppointment = async () => {
    try {
      setIsSubmitting(true);
      
      // Validar datos del formulario
      if (!appointmentDate || !appointmentTime) {
        toast({
          title: "Información incompleta",
          description: "Por favor selecciona fecha y hora para la cita.",
          variant: "destructive",
          duration: 5000,
        });
        setIsSubmitting(false);
        return;
      }
      
      // Formatear la fecha y hora en formato ISO
      const dateTimeString = `${appointmentDate}T${appointmentTime}:00`;
      const appointmentDateTime = new Date(dateTimeString);
      
      // Crear objeto de datos para la API
      const appointmentData = {
        date: appointmentDateTime.toISOString(),
        duration: 60, // duración predeterminada: 60 minutos
        // Ya no enviamos el estado, el backend lo establece como "pending"
      };
      
      // Enviar solicitud de cita
      await fetch('/api/my-appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData),
        credentials: 'include'
      });
      
      // Mostrar mensaje de éxito
      toast({
        title: "Cita solicitada",
        description: "Tu solicitud de cita ha sido enviada y está pendiente de aprobación por tu psicólogo.",
        duration: 5000,
      });
      
      // Cerrar diálogo y reiniciar el formulario
      setIsDialogOpen(false);
      setAppointmentDate("");
      setAppointmentTime("");
      
      // Invalidar consultas para refrescar datos
      queryClient.invalidateQueries({ queryKey: ['/api/my-appointments'] });
    } catch (error) {
      console.error("Error al solicitar cita:", error);
      
      toast({
        title: "Error al solicitar cita",
        description: "Hubo un problema al procesar tu solicitud. Por favor, intenta nuevamente.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Generar fechas disponibles para los próximos 30 días
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 1; i <= 30; i++) {
      const date = addDays(today, i);
      const dayOfWeek = date.getDay();
      
      // Si hay datos de disponibilidad, verificar si el psicólogo trabaja ese día
      if (availability && availability.length > 0) {
        const dayAvailability = availability.find(a => a.day_of_week === dayOfWeek);
        if (dayAvailability) {
          dates.push({
            value: format(date, 'yyyy-MM-dd'),
            label: format(date, 'EEEE d MMMM, yyyy', { locale: es })
          });
        }
      } else {
        // Si no hay datos de disponibilidad, mostrar todos los días de semana (L-V)
        if (dayOfWeek > 0 && dayOfWeek < 6) {
          dates.push({
            value: format(date, 'yyyy-MM-dd'),
            label: format(date, 'EEEE d MMMM, yyyy', { locale: es })
          });
        }
      }
    }
    
    return dates;
  };
  
  // Generar horas disponibles según la disponibilidad del psicólogo
  const getAvailableHours = (selectedDate) => {
    if (!selectedDate) return [];
    
    const date = new Date(selectedDate);
    const dayOfWeek = date.getDay();
    
    // Horarios predeterminados si no hay datos de disponibilidad
    let startTime = "09:00";
    let endTime = "18:00";
    
    // Si hay datos de disponibilidad, obtener el horario específico para ese día
    if (availability && availability.length > 0) {
      const dayAvailability = availability.find(a => a.day_of_week === dayOfWeek);
      if (dayAvailability) {
        startTime = dayAvailability.start_time;
        endTime = dayAvailability.end_time;
      }
    }
    
    // Generar franjas horarias de 1 hora
    const hours = [];
    const start = parseInt(startTime.split(':')[0]);
    const end = parseInt(endTime.split(':')[0]);
    
    for (let hour = start; hour < end; hour++) {
      const timeValue = `${hour.toString().padStart(2, '0')}:00`;
      hours.push({
        value: timeValue,
        label: `${timeValue}`
      });
    }
    
    return hours;
  };
  
  // Determinar si hay próximas citas
  const hasUpcomingAppointments = appointments && appointments.length > 0;
  
  // Obtener la próxima cita
  const getNextAppointment = () => {
    if (!appointments || appointments.length === 0) return null;
    
    const now = new Date();
    const futureAppointments = appointments
      .filter(apt => new Date(apt.date) > now)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return futureAppointments.length > 0 ? futureAppointments[0] : null;
  };
  
  const nextAppointment = getNextAppointment();

  // Función para obtener el color adecuado según el estado de la cita
  const getStatusStyles = (status) => {
    switch(status) {
      case "pending": 
        return "bg-yellow-100 text-yellow-800";
      case "approved": 
        return "bg-green-100 text-green-800";
      case "rejected": 
        return "bg-red-100 text-red-800";
      case "scheduled": 
        return "bg-blue-100 text-blue-800";
      case "completed": 
        return "bg-purple-100 text-purple-800";
      case "cancelled": 
        return "bg-slate-100 text-slate-800";
      case "missed": 
        return "bg-gray-100 text-gray-800";
      default: 
        return "bg-gray-100 text-gray-800";
    }
  };

  // Función para obtener el texto del estado
  const getStatusText = (status) => {
    switch(status) {
      case "pending": return "Pendiente";
      case "approved": return "Aprobada";
      case "rejected": return "Rechazada";
      case "scheduled": return "Programada";
      case "completed": return "Completada";
      case "cancelled": return "Cancelada";
      case "missed": return "Perdida";
      default: return "Desconocido";
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bienvenido, {user?.full_name}</h1>
          <p className="text-muted-foreground">
            Portal de Paciente - Gestiona tus citas y documentos
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Tus próximas citas */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Próximas citas</CardTitle>
              <CardDescription>Tus sesiones programadas</CardDescription>
            </CardHeader>
            <CardContent>
              {isAppointmentsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : nextAppointment ? (
                <div className="space-y-3">
                  <div className="rounded-md border p-3">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {new Date(nextAppointment.date).toLocaleDateString('es', { 
                            weekday: 'long', 
                            day: 'numeric', 
                            month: 'long' 
                          })}
                        </span>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusStyles(nextAppointment.status)}`}>
                          {getStatusText(nextAppointment.status)}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(nextAppointment.date).toLocaleTimeString('es', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })} - Duración: {nextAppointment.duration} min
                      </span>
                      {nextAppointment.notes && (
                        <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
                          {nextAppointment.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button 
                    onClick={notifyFeatureNotAvailable} 
                    className="w-full" 
                    variant="outline"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Ver todas mis citas
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    No tienes citas programadas próximamente.
                  </p>
                  <Button 
                    onClick={() => setIsDialogOpen(true)} 
                    className="w-full" 
                    variant="outline"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Solicitar tu primera cita
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Mi perfil */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Mi perfil</CardTitle>
              <CardDescription>Información personal y preferencias</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-1">
                  <div className="text-sm font-medium">Nombre:</div>
                  <div className="text-sm text-muted-foreground">{user?.full_name}</div>
                  <div className="text-sm font-medium">Email:</div>
                  <div className="text-sm text-muted-foreground">{user?.email}</div>
                </div>
                <Link href="/profile">
                  <Button className="w-full" variant="outline">
                    <UserCircle className="mr-2 h-4 w-4" />
                    Editar perfil
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Documentos y consentimientos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Documentos</CardTitle>
              <CardDescription>Consentimientos y material de apoyo</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                No tienes documentos pendientes de revisión.
              </p>
              <Button 
                onClick={notifyFeatureNotAvailable} 
                className="w-full" 
                variant="outline"
              >
                <FileText className="mr-2 h-4 w-4" />
                Ver documentos
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Acciones rápidas */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones rápidas</CardTitle>
              <CardDescription>
                Accede rápidamente a las funciones principales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full justify-start" 
                      variant="default"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Solicitar nueva cita
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Solicitar una cita</DialogTitle>
                      <DialogDescription>
                        {isPsychologistLoading ? (
                          <span>Cargando información...</span>
                        ) : (
                          <span>Solicita una cita con {psychologist?.full_name || "tu psicólogo/a"}</span>
                        )}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">
                          Fecha
                        </Label>
                        <Select
                          value={appointmentDate}
                          onValueChange={setAppointmentDate}
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Selecciona una fecha" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableDates().map((date) => (
                              <SelectItem key={date.value} value={date.value}>
                                {date.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="time" className="text-right">
                          Hora
                        </Label>
                        <Select
                          value={appointmentTime}
                          onValueChange={setAppointmentTime}
                          disabled={!appointmentDate}
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Selecciona una hora" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableHours(appointmentDate).map((time) => (
                              <SelectItem key={time.value} value={time.value}>
                                {time.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        type="submit" 
                        onClick={handleRequestAppointment}
                        disabled={isSubmitting || !appointmentDate || !appointmentTime}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          "Solicitar cita"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                
                <Button 
                  onClick={notifyFeatureNotAvailable} 
                  className="w-full justify-start" 
                  variant="outline"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Ver historial de citas
                </Button>
                
                <Button 
                  onClick={notifyFeatureNotAvailable} 
                  className="w-full justify-start" 
                  variant="outline"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Contactar a mi psicólogo
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Información y recursos */}
          <Card>
            <CardHeader>
              <CardTitle>Recursos útiles</CardTitle>
              <CardDescription>
                Información y herramientas para tu bienestar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>¿Qué esperar de tu primera sesión?</strong>
                  <br />
                  La primera sesión es una oportunidad para conocer a tu terapeuta y establecer objetivos.
                </p>
                <p>
                  <strong>Preparación para tus sesiones</strong>
                  <br />
                  Para aprovechar al máximo tus sesiones, considera tomar notas sobre tus pensamientos y sentimientos previos.
                </p>
                <p>
                  <strong>Política de cancelación</strong>
                  <br />
                  Si necesitas cancelar o reprogramar una cita, por favor hazlo con al menos 24 horas de anticipación.
                </p>
                <Button 
                  onClick={notifyFeatureNotAvailable} 
                  className="w-full mt-4" 
                  variant="outline"
                >
                  Ver más recursos
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;