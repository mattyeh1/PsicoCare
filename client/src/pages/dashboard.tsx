import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Users, MessageSquare, FileText, Pencil } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import AppointmentCalendar from "@/components/calendar/AppointmentCalendar";
import ProfileCard from "@/components/profile/ProfileCard";
import { Appointment, Patient } from "@shared/schema";

const Dashboard = () => {
  const { user } = useAuth();
  
  // Fetch appointments
  const { data: appointments, isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });
  
  // Fetch patients
  const { data: patients, isLoading: patientsLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  // Format de date to DD/MM/YYYY
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Today's date
  const today = new Date();
  const formattedToday = formatDate(today);
  
  // Calculate stats
  const todayAppointments = appointments?.filter(appointment => {
    const appointmentDate = new Date(appointment.date);
    return appointmentDate.toDateString() === today.toDateString();
  }).length || 0;
  
  const totalPatients = patients?.length || 0;
  
  const upcomingAppointments = appointments?.filter(appointment => {
    const appointmentDate = new Date(appointment.date);
    return appointmentDate > today && appointment.status === 'scheduled';
  }).length || 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bienvenido, {user?.full_name}</h1>
          <p className="text-muted-foreground">
            Aquí tienes un resumen de tu agenda y pacientes
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link href={`/appointments?date=${today.toISOString()}`} className="block">
            <Card className="h-full transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Citas hoy
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todayAppointments}</div>
                <p className="text-xs text-muted-foreground">
                  {todayAppointments === 1 ? 'cita programada' : 'citas programadas'} para {formattedToday}
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/profile" className="block">
            <Card className="h-full transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pacientes totales
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalPatients}</div>
                <p className="text-xs text-muted-foreground">
                  {totalPatients === 1 ? 'paciente activo' : 'pacientes activos'} en tratamiento
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/appointments" className="block">
            <Card className="h-full transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Próximas citas
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{upcomingAppointments}</div>
                <p className="text-xs text-muted-foreground">
                  {upcomingAppointments === 1 ? 'cita próxima' : 'citas próximas'} agendadas
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        <Tabs defaultValue="calendar" className="space-y-4">
          <TabsList>
            <TabsTrigger value="calendar">Calendario</TabsTrigger>
            <TabsTrigger value="profile">Mi perfil</TabsTrigger>
          </TabsList>
          <TabsContent value="calendar" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-full md:col-span-2 lg:col-span-5">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Calendario de citas</CardTitle>
                    <CardDescription>
                      Vista de tus citas programadas y disponibilidad
                    </CardDescription>
                  </div>
                  <Link href="/appointments">
                    <Button variant="outline" size="sm">
                      <Calendar className="mr-2 h-4 w-4" />
                      Ver todo
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="pl-2">
                  <AppointmentCalendar
                    appointments={appointments || []}
                    loading={appointmentsLoading}
                  />
                </CardContent>
              </Card>
              <Card className="col-span-full md:col-span-2">
                <CardHeader>
                  <CardTitle>Acciones rápidas</CardTitle>
                  <CardDescription>
                    Gestiona tus citas y pacientes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Citas</h3>
                      <div className="grid grid-cols-1 gap-2">
                        <Link href="/appointments?action=new">
                          <Button className="w-full justify-start" variant="default">
                            <Calendar className="mr-2 h-4 w-4" />
                            Agendar nueva cita
                          </Button>
                        </Link>
                        <Link href="/appointments">
                          <Button className="w-full justify-start" variant="outline">
                            <Clock className="mr-2 h-4 w-4" />
                            Gestionar citas existentes
                          </Button>
                        </Link>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Comunicaciones</h3>
                      <div className="grid grid-cols-1 gap-2">
                        <Link href="/messages?action=new">
                          <Button className="w-full justify-start" variant="outline">
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Enviar mensaje
                          </Button>
                        </Link>
                        <Link href="/consent-forms">
                          <Button className="w-full justify-start" variant="outline">
                            <FileText className="mr-2 h-4 w-4" />
                            Formularios de consentimiento
                          </Button>
                        </Link>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Pacientes</h3>
                      <div className="grid grid-cols-1 gap-2">
                        <Link href="/profile?action=newPatient">
                          <Button className="w-full justify-start" variant="outline">
                            <Users className="mr-2 h-4 w-4" />
                            Añadir paciente
                          </Button>
                        </Link>
                        <Link href="/profile">
                          <Button className="w-full justify-start" variant="outline">
                            <FileText className="mr-2 h-4 w-4" />
                            Gestionar pacientes
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="profile" className="space-y-4">
            <div className="flex justify-end mb-4">
              <Link href="/profile">
                <Button variant="outline" size="sm">
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar perfil
                </Button>
              </Link>
            </div>
            <ProfileCard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
