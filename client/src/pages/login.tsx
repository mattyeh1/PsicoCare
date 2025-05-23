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

const formSchema = z.object({
  username: z.string().min(3, {
    message: "El nombre de usuario debe tener al menos 3 caracteres.",
  }),
  password: z.string().min(6, {
    message: "La contraseña debe tener al menos 6 caracteres.",
  }),
});

const Login = () => {
  const [, navigate] = useLocation();
  const { loginMutation } = useAuth();
  const isLoading = loginMutation.isPending;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Obtener parámetros de redirección si existen
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get('returnTo') || '/dashboard';
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log("Iniciando login con:", values.username);
    console.log("Redirección después de login a:", returnTo);
    
    loginMutation.mutate(values, {
      onSuccess: () => {
        // Esperar un momento para que la sesión se establezca completamente
        setTimeout(() => {
          console.log("Login exitoso, redirigiendo a:", returnTo);
          // Usar window.location para forzar una recarga completa y asegurar que
          // las cookies de sesión se envíen en todas las solicitudes subsiguientes
          window.location.href = returnTo;
        }, 300);
      }
    });
  };

  return (
    <div className="min-h-screen py-12 gradient-bg flex flex-col items-center justify-center">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-neutral-800">
          Iniciar sesión
        </h2>
        <p className="mt-2 text-center text-sm text-neutral-800">
          Accede a tu cuenta para gestionar tus pacientes y citas
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Ingresa tu contraseña" 
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
                </Button>
              </div>
            </form>
          </Form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-neutral-800">
                  ¿No tienes una cuenta?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link href="/register">
                <Button variant="outline" className="w-full">
                  Registrarse
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
