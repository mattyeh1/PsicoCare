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
import { insertPatientUserSchema } from "@shared/schema";
import { Loader2 } from "lucide-react";

// Esquema del formulario
const formSchema = insertPatientUserSchema.extend({
  password: z.string().min(6, {
    message: "La contraseña debe tener al menos 6 caracteres.",
  }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

const RegisterPatient = () => {
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
      user_type: "patient" as const,
      psychologist_code: "",
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
    const { confirmPassword, psychologist_code, ...userData } = values;
    
    registerMutation.mutate({
      ...userData,
      // Renombramos a psychologist_id, pero en el backend lo manejará como código
      psychologist_code
    }, {
      onSuccess: () => {
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
        <h1 className="text-2xl font-bold">Registro como Paciente</h1>
        <p className="text-muted-foreground mt-1">
          Crea tu cuenta para conectarte con tu psicólogo
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
                      placeholder="Ingresa un nombre de usuario" 
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
              name="psychologist_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código del psicólogo</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Código de 4 dígitos proporcionado por tu psicólogo" 
                      {...field}
                      disabled={isLoading}
                      maxLength={4}
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

export default RegisterPatient;