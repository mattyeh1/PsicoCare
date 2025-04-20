import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  Loader2, 
  MessageSquare, 
  RefreshCcw, 
  XCircle 
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

const AppointmentRequests = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [processingAppointmentId, setProcessingAppointmentId] = useState<number | null>(null);

  // Obtener todas las citas
  const { data: appointments, isLoading, refetch } = useQuery({
    queryKey: ['/api/appointments'],
    enabled: !!user && user.user_type === 'psychologist',
  });

  // Filtrar citas pendientes
  const pendingAppointments = appointments?.filter(
    (appointment: any) => appointment.status === 'pending'
  ) || [];

  // Aprobar una cita
  const handleApproveAppointment = async (appointmentId: number) => {
    try {
      setProcessingAppointmentId(appointmentId);
      
      const response = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'approved',
          notes: notes || undefined
        }),
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: "Cita aprobada",
          description: "La cita ha sido aprobada correctamente.",
          variant: "success",
          duration: 3000,
        });
        setNotes("");
        // Refrescar las citas
        queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      } else {
        const error = await response.json();
        throw new Error(error.message || "Error al aprobar la cita");
      }
    } catch (error) {
      console.error("Error al aprobar cita:", error);
      toast({
        title: "Error",
        description: "No se pudo aprobar la cita. Inténtalo de nuevo.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setProcessingAppointmentId(null);
    }
  };

  // Rechazar una cita
  const handleRejectAppointment = async (appointmentId: number) => {
    try {
      setProcessingAppointmentId(appointmentId);
      
      // Verificar que haya notas explicando el rechazo
      if (!notes.trim()) {
        toast({
          title: "Se requieren notas",
          description: "Por favor, proporciona un motivo para el rechazo de la cita.",
          variant: "destructive",
          duration: 5000,
        });
        setProcessingAppointmentId(null);
        return;
      }
      
      const response = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'rejected',
          notes
        }),
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: "Cita rechazada",
          description: "La cita ha sido rechazada correctamente.",
          variant: "success",
          duration: 3000,
        });
        setNotes("");
        // Refrescar las citas
        queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      } else {
        const error = await response.json();
        throw new Error(error.message || "Error al rechazar la cita");
      }
    } catch (error) {
      console.error("Error al rechazar cita:", error);
      toast({
        title: "Error",
        description: "No se pudo rechazar la cita. Inténtalo de nuevo.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setProcessingAppointmentId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando solicitudes de citas...</p>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Solicitudes de citas</h1>
          <p className="text-muted-foreground">
            Gestiona las solicitudes pendientes de tus pacientes
          </p>
        </div>
        
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCcw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="mb-4">
          <TabsTrigger value="pending">
            Pendientes ({pendingAppointments.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            Todas ({appointments?.length || 0})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingAppointments.length > 0 ? (
              pendingAppointments.map((appointment: any) => (
                <Card key={appointment.id} className="relative">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {format(new Date(appointment.date), 'EEEE d MMMM', { locale: es })}
                        </CardTitle>
                        <CardDescription>
                          {format(new Date(appointment.date), 'h:mm a')} - {appointment.duration} min
                        </CardDescription>
                      </div>
                      <div className="rounded-full px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800">
                        Pendiente
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pb-2">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Fecha solicitada</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(appointment.date), 'PPP', { locale: es })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Hora solicitada</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(appointment.date), 'h:mm a')} - Duración: {appointment.duration} min
                          </p>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <div className="w-full">
                            <p className="text-sm font-medium">Notas para el paciente</p>
                            <Textarea
                              placeholder="Añade notas o instrucciones para el paciente (opcional para aprobar, obligatorio para rechazar)"
                              value={notes}
                              onChange={e => setNotes(e.target.value)}
                              className="mt-1"
                              rows={3}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="flex justify-between pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-200 hover:bg-red-50 hover:text-red-600"
                      onClick={() => handleRejectAppointment(appointment.id)}
                      disabled={!!processingAppointmentId}
                    >
                      {processingAppointmentId === appointment.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      Rechazar
                    </Button>
                    
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleApproveAppointment(appointment.id)}
                      disabled={!!processingAppointmentId}
                    >
                      {processingAppointmentId === appointment.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Aprobar
                    </Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center p-8 border rounded-lg bg-slate-50">
                <p className="text-muted-foreground text-center">
                  No hay solicitudes de citas pendientes por revisar.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="all">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {appointments?.length > 0 ? (
              appointments.map((appointment: any) => (
                <Card key={appointment.id} className="relative">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {format(new Date(appointment.date), 'EEEE d MMMM', { locale: es })}
                        </CardTitle>
                        <CardDescription>
                          {format(new Date(appointment.date), 'h:mm a')} - {appointment.duration} min
                        </CardDescription>
                      </div>
                      <div className={`rounded-full px-2 py-1 text-xs font-semibold 
                        ${appointment.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                          appointment.status === "approved" ? "bg-green-100 text-green-800" :
                          appointment.status === "rejected" ? "bg-red-100 text-red-800" :
                          appointment.status === "scheduled" ? "bg-blue-100 text-blue-800" :
                          appointment.status === "completed" ? "bg-purple-100 text-purple-800" :
                          appointment.status === "cancelled" ? "bg-slate-100 text-slate-800" :
                          "bg-gray-100 text-gray-800"}`
                      }>
                        {appointment.status === "pending" ? "Pendiente" :
                          appointment.status === "approved" ? "Aprobada" :
                          appointment.status === "rejected" ? "Rechazada" :
                          appointment.status === "scheduled" ? "Programada" : 
                          appointment.status === "completed" ? "Completada" :
                          appointment.status === "cancelled" ? "Cancelada" : 
                          appointment.status === "missed" ? "Perdida" : "Desconocido"}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pb-2">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Fecha</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(appointment.date), 'PPP', { locale: es })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Hora</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(appointment.date), 'h:mm a')} - Duración: {appointment.duration} min
                          </p>
                        </div>
                      </div>

                      {appointment.notes && (
                        <>
                          <Separator />
                          <div className="flex items-start gap-2">
                            <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">Notas</p>
                              <p className="text-sm text-muted-foreground">
                                {appointment.notes}
                              </p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center p-8 border rounded-lg bg-slate-50">
                <p className="text-muted-foreground text-center">
                  No hay citas registradas.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AppointmentRequests;