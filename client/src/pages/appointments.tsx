import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format, parseISO, addMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  CalendarIcon, 
  Clock, 
  Plus,
  User,
  Calendar as CalendarIcon2,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppointmentCalendar from "@/components/calendar/AppointmentCalendar";
import TimeSlots from "@/components/calendar/TimeSlots";
import CalendarExportMenu from "@/components/calendar/CalendarExportMenu";
import AppointmentCard from "@/components/calendar/AppointmentCard";
import { cn } from "@/lib/utils";
import { Appointment, Patient, Availability } from "@shared/schema";

// Form schema for appointments
const appointmentFormSchema = z.object({
  patient_id: z.string().min(1, {
    message: "Por favor selecciona un paciente.",
  }),
  date: z.date({
    required_error: "Por favor selecciona una fecha.",
  }),
  time: z.string().min(1, {
    message: "Por favor selecciona una hora.",
  }),
  duration: z.string().min(1, {
    message: "Por favor selecciona una duración.",
  }),
  notes: z.string().optional(),
  payment_receipt: z.instanceof(File).optional(),
});

// Form schema for availability
const availabilityFormSchema = z.object({
  day_of_week: z.string().min(1, {
    message: "Por favor selecciona un día de la semana.",
  }),
  start_time: z.string().min(1, {
    message: "Por favor selecciona una hora de inicio.",
  }),
  end_time: z.string().min(1, {
    message: "Por favor selecciona una hora de fin.",
  }),
});

const Appointments = () => {
  const { user, isAuthenticated, refetchUser } = useAuth();
  const { toast } = useToast();
  
  // Refrescar datos de usuario al cargar la página
  useEffect(() => {
    if (refetchUser) {
      refetchUser();
    }
  }, [refetchUser]);
  const [isCreating, setIsCreating] = useState(false);
  const [isAddingAvailability, setIsAddingAvailability] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isLoading, setIsLoading] = useState(false);

  // Fetch patients
  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  // Fetch appointments
  const { data: appointments, isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  // Fetch availability
  const { data: availability, isLoading: availabilityLoading } = useQuery<Availability[]>({
    queryKey: ["/api/availability"],
  });

  // Create appointment form
  const form = useForm<z.infer<typeof appointmentFormSchema>>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      patient_id: "",
      date: new Date(),
      time: "",
      duration: "60",
      notes: "",
      payment_receipt: undefined,
    },
  });

  // Create availability form
  const availabilityForm = useForm<z.infer<typeof availabilityFormSchema>>({
    resolver: zodResolver(availabilityFormSchema),
    defaultValues: {
      day_of_week: "",
      start_time: "",
      end_time: "",
    },
  });

  // Mutation for creating appointments
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/appointments", data);
    },
    onSuccess: () => {
      toast({
        title: "Cita creada",
        description: "La cita ha sido creada exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setIsCreating(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear la cita. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating appointment status
  const updateAppointmentStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest("PUT", `/api/appointments/${id}`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Estado actualizado",
        description: "El estado de la cita ha sido actualizado.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la cita.",
        variant: "destructive",
      });
    },
  });

  // Mutation for creating availability
  const createAvailabilityMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/availability", data);
    },
    onSuccess: () => {
      toast({
        title: "Disponibilidad agregada",
        description: "El horario de disponibilidad ha sido agregado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/availability"] });
      setIsAddingAvailability(false);
      availabilityForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo agregar la disponibilidad. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting availability
  const deleteAvailabilityMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/availability/${id}`, undefined);
    },
    onSuccess: () => {
      toast({
        title: "Disponibilidad eliminada",
        description: "El horario de disponibilidad ha sido eliminado.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/availability"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la disponibilidad.",
        variant: "destructive",
      });
    },
  });

  // Submit appointment form
  const onSubmit = async (values: z.infer<typeof appointmentFormSchema>) => {
    const selectedDateTime = new Date(values.date);
    const [hours, minutes] = values.time.split(':').map(Number);
    
    selectedDateTime.setHours(hours, minutes, 0, 0);
    
    // Crear un objeto FormData para enviar el archivo si existe
    const formData = new FormData();
    formData.append('patient_id', values.patient_id);
    formData.append('psychologist_id', user?.id ? user.id.toString() : '');
    formData.append('date', selectedDateTime.toISOString());
    formData.append('duration', values.duration);
    formData.append('status', 'scheduled');
    if (values.notes) formData.append('notes', values.notes);
    
    // Adjuntar comprobante de pago si se proporcionó
    if (values.payment_receipt) {
      formData.append('payment_receipt', values.payment_receipt);
    }
    
    // Usar función fetch directamente para manejar FormData
    try {
      setIsLoading(true);
      const response = await fetch('/api/appointments', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Error al crear la cita');
      }
      
      // Si la respuesta es exitosa
      toast({
        title: "Cita creada",
        description: "La cita ha sido creada exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setIsCreating(false);
      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la cita. Inténtalo de nuevo.",
        variant: "destructive",
      });
      console.error("Error al crear cita:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Submit availability form
  const onSubmitAvailability = async (values: z.infer<typeof availabilityFormSchema>) => {
    const availabilityData = {
      psychologist_id: user?.id,
      day_of_week: parseInt(values.day_of_week),
      start_time: values.start_time,
      end_time: values.end_time,
    };
    
    createAvailabilityMutation.mutate(availabilityData);
  };

  // Filter appointments by status
  const upcomingAppointments = appointments?.filter(
    (appointment) => new Date(appointment.date) >= new Date() && 
      (appointment.status === 'scheduled' || appointment.status === 'approved' || appointment.status === 'pending')
  ) || [];
  
  const pastAppointments = appointments?.filter(
    (appointment) => new Date(appointment.date) < new Date() || 
      (appointment.status !== 'scheduled' && appointment.status !== 'approved' && appointment.status !== 'pending')
  ) || [];

  // Get patient name by id
  const getPatientName = (patientId: number) => {
    const patient = patients?.find(p => p.id === patientId);
    return patient ? patient.name : 'Paciente desconocido';
  };

  // Format day of week
  const formatDayOfWeek = (day: number) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[day] || 'Desconocido';
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-800">Programada</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completada</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelada</Badge>;
      case 'missed':
        return <Badge className="bg-yellow-100 text-yellow-800">Ausente</Badge>;
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-800">Pendiente</Badge>;
      case 'approved':
        return <Badge className="bg-cyan-100 text-cyan-800">Aprobada</Badge>;
      default:
        return <Badge>Desconocido</Badge>;
    }
  };
  
  // Renderizar el botón de exportación a calendario junto con el estado
  const renderStatusWithExport = (appointment: Appointment) => {
    return (
      <div className="flex items-center gap-2">
        {(appointment.status === 'scheduled' || appointment.status === 'approved' || appointment.status === 'pending') && (
          <CalendarExportMenu appointmentId={appointment.id} buttonStyle="icon" iconSize={16} />
        )}
        {getStatusBadge(appointment.status)}
      </div>
    );
  };

  return (
    <div className="container py-8">
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Citas</h1>
            <p className="text-muted-foreground">
              Gestiona tus citas y disponibilidad
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsAddingAvailability(true)}
              variant="outline"
            >
              <Clock className="h-4 w-4 mr-2" />
              Agregar disponibilidad
            </Button>
            <Button
              onClick={() => setIsCreating(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva cita
            </Button>
          </div>
        </div>

        {/* Create appointment dialog */}
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Crear nueva cita</DialogTitle>
              <DialogDescription>
                Agenda una nueva cita para un paciente
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="patient_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paciente</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un paciente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {patients?.map((patient) => (
                            <SelectItem key={patient.id} value={patient.id.toString()}>
                              {patient.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: es })
                              ) : (
                                <span>Selecciona una fecha</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona una hora" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.from({ length: 13 }).map((_, index) => {
                              const hour = index + 8; // Start from 8 AM
                              return (
                                <SelectItem 
                                  key={hour} 
                                  value={`${hour.toString().padStart(2, '0')}:00`}
                                >
                                  {`${hour.toString().padStart(2, '0')}:00`}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duración (minutos)</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona duración" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="30">30 minutos</SelectItem>
                            <SelectItem value="45">45 minutos</SelectItem>
                            <SelectItem value="60">60 minutos</SelectItem>
                            <SelectItem value="90">90 minutos</SelectItem>
                            <SelectItem value="120">120 minutos</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas (opcional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Agrega notas relevantes sobre la cita"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="payment_receipt"
                  render={({ field: { value, onChange, ...fieldProps } }) => (
                    <FormItem>
                      <FormLabel>Comprobante de pago (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              onChange(file);
                            }
                          }}
                          {...fieldProps}
                        />
                      </FormControl>
                      <p className="text-sm text-muted-foreground">
                        Sube un comprobante de pago (formatos aceptados: JPG, PNG, PDF)
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    type="button"
                    onClick={() => setIsCreating(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creando...
                      </>
                    ) : "Crear cita"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Add availability dialog */}
        <Dialog open={isAddingAvailability} onOpenChange={setIsAddingAvailability}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Agregar disponibilidad</DialogTitle>
              <DialogDescription>
                Configura tus horarios disponibles para citas
              </DialogDescription>
            </DialogHeader>
            <Form {...availabilityForm}>
              <form onSubmit={availabilityForm.handleSubmit(onSubmitAvailability)} className="space-y-4">
                <FormField
                  control={availabilityForm.control}
                  name="day_of_week"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Día de la semana</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un día" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">Lunes</SelectItem>
                          <SelectItem value="2">Martes</SelectItem>
                          <SelectItem value="3">Miércoles</SelectItem>
                          <SelectItem value="4">Jueves</SelectItem>
                          <SelectItem value="5">Viernes</SelectItem>
                          <SelectItem value="6">Sábado</SelectItem>
                          <SelectItem value="0">Domingo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={availabilityForm.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora de inicio</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Inicio" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.from({ length: 13 }).map((_, index) => {
                              const hour = index + 8; // Start from 8 AM
                              return (
                                <SelectItem 
                                  key={hour} 
                                  value={`${hour.toString().padStart(2, '0')}:00`}
                                >
                                  {`${hour.toString().padStart(2, '0')}:00`}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={availabilityForm.control}
                    name="end_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora de fin</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Fin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.from({ length: 13 }).map((_, index) => {
                              const hour = index + 9; // Start from 9 AM
                              return (
                                <SelectItem 
                                  key={hour} 
                                  value={`${hour.toString().padStart(2, '0')}:00`}
                                >
                                  {`${hour.toString().padStart(2, '0')}:00`}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    type="button"
                    onClick={() => setIsAddingAvailability(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createAvailabilityMutation.isPending}>
                    {createAvailabilityMutation.isPending ? "Agregando..." : "Agregar disponibilidad"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Tabs defaultValue="calendar" className="space-y-4">
          <TabsList>
            <TabsTrigger value="calendar">Calendario</TabsTrigger>
            <TabsTrigger value="upcoming">Próximas ({upcomingAppointments.length})</TabsTrigger>
            <TabsTrigger value="past">Historial ({pastAppointments.length})</TabsTrigger>
            <TabsTrigger value="availability">Disponibilidad</TabsTrigger>
          </TabsList>
          
          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <CardTitle>Vista de calendario</CardTitle>
                <CardDescription>
                  Visualiza todas tus citas programadas en el calendario
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AppointmentCalendar 
                  appointments={appointments || []} 
                  loading={appointmentsLoading}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="upcoming">
            <Card>
              <CardHeader>
                <CardTitle>Próximas citas</CardTitle>
                <CardDescription>
                  Lista de todas tus citas programadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingAppointments.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarIcon2 className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">No hay citas programadas</h3>
                    <p className="mt-1 text-sm text-gray-500">Crea una nueva cita haciendo clic en el botón "Nueva cita".</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingAppointments
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((appointment) => (
                        <AppointmentCard
                          key={appointment.id}
                          appointment={appointment}
                          getPatientName={getPatientName}
                          onUpdateStatus={(id, status) => 
                            updateAppointmentStatusMutation.mutate({ id, status })}
                          isPending={updateAppointmentStatusMutation.isPending}
                        />
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="past">
            <Card>
              <CardHeader>
                <CardTitle>Historial de citas</CardTitle>
                <CardDescription>
                  Consulta el historial de citas pasadas y canceladas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pastAppointments.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarIcon2 className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">No hay historial de citas</h3>
                    <p className="mt-1 text-sm text-gray-500">Tu historial de citas aparecerá aquí cuando tengas citas completadas o canceladas.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pastAppointments
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((appointment) => (
                        <AppointmentCard
                          key={appointment.id}
                          appointment={appointment}
                          getPatientName={getPatientName}
                          onUpdateStatus={(id, status) => 
                            updateAppointmentStatusMutation.mutate({ id, status })}
                          isPending={updateAppointmentStatusMutation.isPending}
                          isPast={true}
                        />
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="availability">
            <Card>
              <CardHeader>
                <CardTitle>Mi disponibilidad</CardTitle>
                <CardDescription>
                  Configura tus horarios disponibles para citas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {availabilityLoading ? (
                  <div className="py-8 text-center">Cargando disponibilidad...</div>
                ) : availability && availability.length > 0 ? (
                  <div className="space-y-4">
                    {availability
                      .sort((a, b) => a.day_of_week - b.day_of_week)
                      .map((slot) => (
                        <div 
                          key={slot.id} 
                          className="flex justify-between items-center p-4 border rounded-md"
                        >
                          <div>
                            <p className="font-medium">
                              {formatDayOfWeek(slot.day_of_week)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {slot.start_time} - {slot.end_time}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteAvailabilityMutation.mutate(slot.id)}
                            disabled={deleteAvailabilityMutation.isPending}
                          >
                            {deleteAvailabilityMutation.isPending ? "Eliminando..." : "Eliminar"}
                          </Button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">No hay horarios configurados</h3>
                    <p className="mt-1 text-sm text-gray-500">Configura tus horarios disponibles haciendo clic en "Agregar disponibilidad".</p>
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

export default Appointments;
