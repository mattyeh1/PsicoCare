import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, Clock, FileText, MessageSquare, UserCircle 
} from "lucide-react";
import { Link } from "wouter";

const PatientDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Función para notificar que la funcionalidad no está disponible
  const notifyFeatureNotAvailable = () => {
    toast({
      title: "Funcionalidad en desarrollo",
      description: "Esta parte de la aplicación está actualmente en desarrollo. Pronto estará disponible.",
      duration: 3000,
    });
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
              <p className="text-sm text-muted-foreground mb-4">
                No tienes citas programadas próximamente.
              </p>
              <Button 
                onClick={notifyFeatureNotAvailable} 
                className="w-full" 
                variant="outline"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Ver calendario de citas
              </Button>
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
                <Button 
                  onClick={notifyFeatureNotAvailable} 
                  className="w-full justify-start" 
                  variant="default"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Solicitar nueva cita
                </Button>
                
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