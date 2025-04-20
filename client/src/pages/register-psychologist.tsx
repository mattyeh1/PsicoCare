import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { insertPsychologistSchema } from "@shared/schema";
import { Loader2 } from "lucide-react";

// Esquema del formulario
const formSchema = insertPsychologistSchema.extend({
  password: z.string().min(6, {
    message: "La contraseña debe tener al menos 6 caracteres.",
  }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

const RegisterPsychologist = () => {
  const [, navigate] = useLocation();
  const { registerMutation } = useAuth();
  const isLoading = registerMutation.isPending;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      email: "",
      full_name: "",
      specialty: "",
      bio: "",
      education: "",
      certifications: "",
      profile_image: "",
      user_type: "psychologist" as const,
    },
  });

  // Si el usuario ya está autenticado, redirigir al dashboard
  const { user, isAuthenticated } = useAuth();
  useEffect(() => {
    if (user && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [user, isAuthenticated, navigate]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // Eliminar confirmPassword antes de enviar al servidor
    const { confirmPassword, ...userData } = values;
    
    registerMutation.mutate(userData, {
      onSuccess: (data) => {
        // Mostrar el código único generado para el psicólogo
        if (data && data.unique_code) {
          alert(`Tu código único es: ${data.unique_code}\n\nGuárdalo bien, tus pacientes lo necesitarán para registrarse y conectarse contigo.`);
        }
        
        // Redirigir al dashboard
        window.location.href = "/dashboard";
      },
      onError: (error) => {
        form.setError("root", { 
          message: error.message || "Error al registrar usuario. Inténtalo de nuevo." 
        });
      }
    });
  };

  return (
    <div className="container mx-auto p-4 py-8 flex flex-col items-center min-h-screen">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">Registro como Profesional</h1>
        <p className="text-muted-foreground mt-1">
          Crea tu cuenta para gestionar tu práctica psicológica
        </p>
      </div>

      <div className="w-full max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de usuario</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ingresa tu nombre de usuario" 
                      {...field} 
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Contraseña" 
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar contraseña</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Confirmar contraseña" 
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo electrónico</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="tu@email.com" 
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Nombre y apellidos" 
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specialty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Especialidad</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ej: Psicología Clínica, Terapia Familiar, etc." 
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Biografía</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Breve descripción de tu perfil profesional" 
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="education"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Formación académica</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe tu formación académica" 
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="certifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Certificaciones</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Certificaciones, licencias o acreditaciones" 
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.formState.errors.root && (
              <div className="text-red-500 text-sm mt-2">
                {form.formState.errors.root.message}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : "Crear cuenta"}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Iniciar sesión
            </Link>
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            <Link href="/register-selection" className="text-primary hover:underline">
              Volver a selección de registro
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPsychologist;