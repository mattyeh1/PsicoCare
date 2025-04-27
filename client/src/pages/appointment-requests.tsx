import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, addMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  X,
  Calendar,
  Clock,
  User,
  FileText,
  Calendar as CalendarIcon2,
  Loader2,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CalendarExportMenu from "@/components/calendar/CalendarExportMenu";
import { Appointment, Patient } from "@shared/schema";

const AppointmentRequests = () => {
  const { user, isAuthenticated, refetchUser } = useAuth();
  const { toast } = useToast();
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  
  // Refrescar datos de usuario al cargar la página
  useEffect(() => {
    if (refetchUser) {
      refetchUser();
    }
  }, [refetchUser]);

  // Fetch appointments
  const { data: appointments, isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  // Fetch patients
  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  // Mutation para aprobar una cita
  const approveAppointmentMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes?: string }) => {
      return apiRequest("POST", `/api/appointments/${id}/approve`, { notes });
    },
    onSuccess: () => {
      toast({
        title: "Cita aprobada",
        description: "La solicitud de cita ha sido aprobada exitosamente.",
      });
      // Invalidar la consulta para actualizar los datos
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
    },
    onError: (error) => {
      console.error("Error al aprobar cita:", error);
      toast({
        title: "Error",
        description: "No se pudo aprobar la solicitud de cita. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation para rechazar una cita
  const rejectAppointmentMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      if (!reason || reason.trim() === "") {
        throw new Error("El motivo del rechazo es obligatorio");
      }
      return apiRequest("POST", `/api/appointments/${id}/reject`, { reason });
    },
    onSuccess: () => {
      toast({
        title: "Cita rechazada",
        description: "La solicitud de cita ha sido rechazada correctamente.",
      });
      // Invalidar la consulta para actualizar los datos
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      // Limpiar el motivo de rechazo y cerrar el diálogo
      setRejectionReason("");
      setSelectedAppointment(null);
    },
    onError: (error) => {
      console.error("Error al rechazar cita:", error);
      toast({
        title: "Error",
        description: error instanceof Error 
          ? error.message 
          : "No se pudo rechazar la solicitud de cita. Asegúrate de proporcionar un motivo.",
        variant: "destructive",
      });
    },
  });

  // Filter pending appointments
  const pendingAppointments = appointments?.filter(
    (appointment) => appointment.status === 'pending'
  ) || [];
  
  // Filter approved appointments
  const approvedAppointments = appointments?.filter(
    (appointment) => appointment.status === 'approved'
  ) || [];
  
  // Filter rejected appointments
  const rejectedAppointments = appointments?.filter(
    (appointment) => appointment.status === 'rejected'
  ) || [];

  // Get patient name by id
  const getPatientName = (patientId: number) => {
    const patient = patients?.find(p => p.id === patientId);
    return patient ? patient.name : 'Paciente desconocido';
  };

  // Handle approve
  const handleApprove = (appointment: Appointment) => {
    approveAppointmentMutation.mutate({ 
      id: appointment.id, 
      notes: appointment.notes || undefined
    });
  };

  // Handle reject
  const handleReject = (appointment: Appointment) => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Se requiere un motivo",
        description: "Por favor, proporciona un motivo para rechazar la solicitud.",
        variant: "destructive",
      });
      return;
    }
    
    rejectAppointmentMutation.mutate({ 
      id: appointment.id, 
      reason: rejectionReason
    });
  };

  return (
    <div className="container py-8">
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Solicitudes de Citas</h1>
            <p className="text-muted-foreground">
              Gestiona las solicitudes de citas pendientes
            </p>
          </div>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">Pendientes ({pendingAppointments.length})</TabsTrigger>
            <TabsTrigger value="approved">Aprobadas ({approvedAppointments.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rechazadas ({rejectedAppointments.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Solicitudes pendientes</CardTitle>
                <CardDescription>
                  Revisa y toma decisiones sobre las solicitudes de citas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingAppointments.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarIcon2 className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">No hay solicitudes pendientes</h3>
                    <p className="mt-1 text-sm text-gray-500">Las solicitudes de citas pendientes aparecerán aquí cuando sean creadas.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingAppointments
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((appointment) => (
                        <Card key={appointment.id}>
                          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                            <div>
                              <CardTitle className="text-base font-semibold flex items-center">
                                <User className="h-4 w-4 mr-2" />
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
                            <Badge variant="outline">Pendiente</Badge>
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
                              {/* Aprobar directamente */}
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleApprove(appointment)}
                                disabled={approveAppointmentMutation.isPending}
                              >
                                {approveAppointmentMutation.isPending ? (
                                  <>
                                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                    Procesando...
                                  </>
                                ) : (
                                  <>
                                    <Check className="mr-1.5 h-4 w-4" />
                                    Aprobar
                                  </>
                                )}
                              </Button>

                              {/* Diálogo de rechazo */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setSelectedAppointment(appointment)}
                                    disabled={rejectAppointmentMutation.isPending}
                                  >
                                    <X className="mr-1.5 h-4 w-4" />
                                    Rechazar
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Rechazar solicitud de cita?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Debes proporcionar un motivo para el rechazo:
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <Textarea
                                    placeholder="Motivo del rechazo..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    className="mt-2"
                                    disabled={rejectAppointmentMutation.isPending}
                                  />
                                  <AlertDialogFooter>
                                    <AlertDialogCancel disabled={rejectAppointmentMutation.isPending}>
                                      Cancelar
                                    </AlertDialogCancel>
                                    <Button 
                                      onClick={() => {
                                        if (selectedAppointment) {
                                          handleReject(selectedAppointment);
                                        }
                                      }}
                                      disabled={rejectAppointmentMutation.isPending || !rejectionReason.trim()}
                                    >
                                      {rejectAppointmentMutation.isPending ? (
                                        <>
                                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                          Procesando...
                                        </>
                                      ) : (
                                        "Confirmar rechazo"
                                      )}
                                    </Button>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </CardFooter>
                        </Card>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="approved">
            <Card>
              <CardHeader>
                <CardTitle>Solicitudes aprobadas</CardTitle>
                <CardDescription>
                  Citas aprobadas recientemente
                </CardDescription>
              </CardHeader>
              <CardContent>
                {approvedAppointments.length === 0 ? (
                  <div className="text-center py-12">
                    <Check className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">No hay solicitudes aprobadas</h3>
                    <p className="mt-1 text-sm text-gray-500">Las solicitudes aprobadas aparecerán aquí.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {approvedAppointments
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((appointment) => (
                        <Card key={appointment.id}>
                          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                            <div>
                              <CardTitle className="text-base font-semibold flex items-center">
                                <User className="h-4 w-4 mr-2" />
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
                            <div className="flex items-center gap-2">
                              <CalendarExportMenu appointmentId={appointment.id} buttonStyle="icon" iconSize={16} />
                              <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Aprobada</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pb-2">
                            {appointment.notes && (
                              <div className="text-sm mt-2">
                                <span className="font-medium">Notas:</span> {appointment.notes}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rejected">
            <Card>
              <CardHeader>
                <CardTitle>Solicitudes rechazadas</CardTitle>
                <CardDescription>
                  Citas rechazadas recientemente
                </CardDescription>
              </CardHeader>
              <CardContent>
                {rejectedAppointments.length === 0 ? (
                  <div className="text-center py-12">
                    <X className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">No hay solicitudes rechazadas</h3>
                    <p className="mt-1 text-sm text-gray-500">Las solicitudes rechazadas aparecerán aquí.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rejectedAppointments
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((appointment) => (
                        <Card key={appointment.id}>
                          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                            <div>
                              <CardTitle className="text-base font-semibold flex items-center">
                                <User className="h-4 w-4 mr-2" />
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
                            <Badge variant="destructive">Rechazada</Badge>
                          </CardHeader>
                          <CardContent className="pb-2">
                            {appointment.notes && (
                              <div className="text-sm mt-2">
                                <span className="font-medium">Notas:</span> {appointment.notes}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AppointmentRequests;