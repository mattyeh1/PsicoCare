import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, X, Clock, Calendar, Loader2, Search, Filter } from 'lucide-react';

import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

// Componente principal
const AppointmentRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');

  // Obtener las solicitudes de citas pendientes
  const { data: appointments, isLoading: isLoadingAppointments, refetch: refetchAppointments } = useQuery({
    queryKey: ['/api/appointments'],
    enabled: !!user && user.user_type === 'psychologist',
  });

  // Obtener pacientes para mostrar sus nombres
  const { data: patients, isLoading: isLoadingPatients } = useQuery({
    queryKey: ['/api/patients'],
    enabled: !!user && user.user_type === 'psychologist',
  });

  // Mutación para aprobar una cita
  const approveMutation = useMutation({
    mutationFn: async (data: { id: number, notes?: string }) => {
      const response = await fetch(`/api/appointments/${data.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: data.notes }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al aprobar la cita');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Cita aprobada",
        description: "La solicitud ha sido aprobada exitosamente.",
        duration: 3000,
      });
      
      // Refrescar datos
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      setSelectedAppointment(null);
      setApprovalNotes('');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    }
  });

  // Mutación para rechazar una cita
  const rejectMutation = useMutation({
    mutationFn: async (data: { id: number, reason: string }) => {
      const response = await fetch(`/api/appointments/${data.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: data.reason }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al rechazar la cita');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Cita rechazada",
        description: "La solicitud ha sido rechazada.",
        duration: 3000,
      });
      
      // Refrescar datos
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      setSelectedAppointment(null);
      setRejectionReason('');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    }
  });

  // Filtrar citas según el estado seleccionado y término de búsqueda
  const filteredAppointments = React.useMemo(() => {
    if (!appointments) return [];
    
    let filtered = [...appointments];
    
    // Aplicar filtro por estado
    if (filter !== 'all') {
      filtered = filtered.filter(app => app.status === filter);
    }
    
    // Aplicar término de búsqueda (busca en notas y fecha)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(app => {
        // Buscar paciente relacionado
        const patient = patients?.find(p => p.id === app.patient_id);
        const patientName = patient?.name?.toLowerCase() || '';
        
        // Buscar en fecha (en formato legible)
        const appDate = new Date(app.date);
        const dateStr = format(appDate, 'EEEE d MMMM, yyyy HH:mm', { locale: es }).toLowerCase();
        
        // Buscar en notas
        const notes = app.notes?.toLowerCase() || '';
        
        return patientName.includes(searchLower) || 
               dateStr.includes(searchLower) || 
               notes.includes(searchLower);
      });
    }
    
    // Ordenar por fecha: las más recientes primero
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [appointments, filter, searchTerm, patients]);

  // Función para manejar la aprobación de una cita
  const handleApprove = (appointment: any) => {
    approveMutation.mutate({
      id: appointment.id,
      notes: approvalNotes.trim() || undefined
    });
  };

  // Función para manejar el rechazo de una cita
  const handleReject = (appointment: any) => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Se requiere un motivo",
        description: "Por favor, indique el motivo del rechazo.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    rejectMutation.mutate({
      id: appointment.id,
      reason: rejectionReason
    });
  };

  // Función para mostrar el nombre del paciente
  const getPatientName = (patientId: number): string => {
    if (!patients) return "Paciente";
    
    const patient = patients.find(p => p.id === patientId);
    return patient ? patient.name : "Paciente";
  };

  // Mostrar interfaz de carga mientras se obtienen los datos
  if (isLoadingAppointments || isLoadingPatients) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Solicitudes de citas</h1>
          <p className="text-muted-foreground">
            Gestiona las solicitudes de citas de tus pacientes
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Filtros y búsqueda */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por paciente, fecha o notas" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select 
                value={filter}
                onValueChange={setFilter}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="approved">Aprobadas</SelectItem>
                  <SelectItem value="rejected">Rechazadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contenido principal */}
          <div className="grid gap-4">
            {filteredAppointments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-64">
                  <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No hay solicitudes de citas {filter !== 'all' ? `con estado "${filter}"` : ''}</p>
                  <p className="text-sm text-muted-foreground">
                    {filter === 'pending' 
                      ? 'No tienes solicitudes pendientes de revisión.'
                      : 'Las solicitudes de citas aparecerán aquí cuando tus pacientes las realicen.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredAppointments.map(appointment => (
                <Card key={appointment.id} className={`overflow-hidden border-l-4 ${
                  appointment.status === 'pending' ? 'border-l-yellow-500' :
                  appointment.status === 'approved' ? 'border-l-green-500' :
                  appointment.status === 'rejected' ? 'border-l-red-500' :
                  'border-l-transparent'
                }`}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {getPatientName(appointment.patient_id)}
                        </CardTitle>
                        <CardDescription>
                          <div className="flex items-center gap-1 mt-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="capitalize">
                              {format(new Date(appointment.date), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              {format(new Date(appointment.date), "HH:mm", { locale: es })} - 
                              Duración: {appointment.duration} min
                            </span>
                          </div>
                        </CardDescription>
                      </div>
                      <Badge variant={
                        appointment.status === 'pending' ? 'warning' :
                        appointment.status === 'approved' ? 'success' : 
                        appointment.status === 'rejected' ? 'destructive' : 
                        'outline'
                      }>
                        {appointment.status === 'pending' ? 'Pendiente' :
                         appointment.status === 'approved' ? 'Aprobada' :
                         appointment.status === 'rejected' ? 'Rechazada' :
                         appointment.status === 'scheduled' ? 'Programada' :
                         appointment.status === 'completed' ? 'Completada' :
                         appointment.status === 'cancelled' ? 'Cancelada' :
                         appointment.status === 'missed' ? 'Perdida' : 'Desconocido'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    {appointment.notes && (
                      <div className="text-sm mt-2">
                        <span className="font-medium">Notas:</span> {appointment.notes}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <div className="flex gap-2 justify-end w-full">
                      {appointment.status === 'pending' && (
                        <>
                          {/* Diálogo de aprobación */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                size="sm" 
                                onClick={() => setSelectedAppointment(appointment)}
                              >
                                <Check className="mr-1.5 h-4 w-4" />
                                Aprobar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Aprobar solicitud de cita</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Estás seguro de que deseas aprobar esta solicitud de cita con {getPatientName(appointment.patient_id)} para el {format(new Date(appointment.date), "d 'de' MMMM 'a las' HH:mm", { locale: es })}?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="py-4">
                                <Label htmlFor="approval-notes">Notas adicionales (opcional)</Label>
                                <Textarea
                                  id="approval-notes"
                                  placeholder="Añade instrucciones o información para el paciente..."
                                  value={approvalNotes}
                                  onChange={(e) => setApprovalNotes(e.target.value)}
                                  className="mt-2"
                                />
                              </div>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => {
                                  setSelectedAppointment(null);
                                  setApprovalNotes('');
                                }}>
                                  Cancelar
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleApprove(appointment)}
                                  disabled={approveMutation.isPending}
                                >
                                  {approveMutation.isPending ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Procesando...
                                    </>
                                  ) : (
                                    "Aprobar cita"
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          {/* Diálogo de rechazo */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => setSelectedAppointment(appointment)}
                              >
                                <X className="mr-1.5 h-4 w-4" />
                                Rechazar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Rechazar solicitud de cita</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Estás rechazando la solicitud de cita con {getPatientName(appointment.patient_id)}. 
                                  Por favor, indica el motivo para informar al paciente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="py-4">
                                <Label htmlFor="rejection-reason" className="text-right">
                                  Motivo del rechazo (requerido)
                                </Label>
                                <Textarea
                                  id="rejection-reason"
                                  placeholder="Indica por qué no puedes atender esta cita..."
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  className="mt-2"
                                />
                              </div>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => {
                                  setSelectedAppointment(null);
                                  setRejectionReason('');
                                }}>
                                  Cancelar
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleReject(appointment)}
                                  disabled={rejectMutation.isPending || !rejectionReason.trim()}
                                >
                                  {rejectMutation.isPending ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Procesando...
                                    </>
                                  ) : (
                                    "Rechazar cita"
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentRequests;