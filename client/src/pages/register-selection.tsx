import { Link } from "wouter";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { User, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";

const RegisterSelection = () => {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();

  // Redirigir a dashboard si ya está autenticado
  useEffect(() => {
    if (user && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [user, isAuthenticated, navigate]);

  return (
    <div className="container mx-auto px-4 py-10 flex flex-col items-center min-h-screen">
      <div className="text-center max-w-md mx-auto mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Registro</h1>
        <p className="text-muted-foreground mt-2">
          Selecciona el tipo de cuenta que deseas crear
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 w-full max-w-4xl">
        <Card className="flex flex-col">
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <User className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Profesional</CardTitle>
            <CardDescription>
              Para profesionales de la psicología que desean gestionar su práctica
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center">
                <span className="mr-2 text-green-500">✓</span>
                <span>Gestiona pacientes</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2 text-green-500">✓</span>
                <span>Programa citas</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2 text-green-500">✓</span>
                <span>Formularios de consentimiento</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2 text-green-500">✓</span>
                <span>Mensajería segura</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => navigate('/register-psychologist')}>
              Registro como profesional
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <UserPlus className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Paciente</CardTitle>
            <CardDescription>
              Para pacientes que quieren conectarse con su psicólogo
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center">
                <span className="mr-2 text-green-500">✓</span>
                <span>Accede a tus citas</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2 text-green-500">✓</span>
                <span>Firma formularios electrónicamente</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2 text-green-500">✓</span>
                <span>Comunicación segura</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2 text-green-500">✓</span>
                <span>Protección de datos</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => navigate('/register-patient')}>
              Registro como paciente
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          ¿Ya tienes una cuenta?{" "}
          <Link href="/login" className="text-primary underline hover:text-primary/90">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterSelection;