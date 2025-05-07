import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

// Esquema para formulario de perfil de paciente
const formSchema = z.object({
  full_name: z.string().min(3, {
    message: "El nombre debe tener al menos 3 caracteres.",
  }),
  email: z.string().email({
    message: "Email inválido.",
  }),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

// Tipo de datos para usuario
type User = {
  id: number;
  username: string;
  full_name: string;
  email: string;
  user_type: 'psychologist' | 'patient';
  phone?: string;
  notes?: string;
  profile_image?: string;
};

export default function PatientProfilePage() {
  // Estado local
  const [isEditing, setIsEditing] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  // Obtener toast
  const { toast } = useToast();

  // Formulario para perfil de usuario
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      notes: "",
    },
  });

  // Fetch user profile data
  const { data: userData, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/auth/me"]
  });
  
  // Determinar el tipo de usuario basado en los datos reales del usuario
  const isPatient = userData?.user_type === 'patient';
  
  // Actualizar formulario cuando se reciban los datos
  React.useEffect(() => {
    if (userData) {
      form.reset({
        full_name: userData.full_name || "",
        email: userData.email || "",
        phone: userData.phone || "",
        notes: userData.notes || "",
      });
      // Log para depuración
      console.log("Datos de usuario recibidos:", JSON.stringify(userData, null, 2));
    }
  }, [userData, form]);

  // Submit profile form
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      if (!userData?.id) {
        throw new Error("No se encontró información del usuario");
      }
      
      const res = await apiRequest("PUT", `/api/users/${userData.id}`, values);
      await res.json();
      
      toast({
        title: "Perfil actualizado",
        description: "Tu información personal ha sido actualizada correctamente.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el perfil. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Verificación de seguridad - este componente es solo para pacientes
  if (userData && !isPatient) {
    toast({
      title: "Acceso denegado",
      description: "No tienes permiso para acceder a esta página.",
      variant: "destructive",
    });
    window.location.href = "/psychologist-profile";
    return null;
  }

  // Renderizado principal
  return (
    <div className="container py-8">
      <div className="flex flex-col gap-8">
        {/* Encabezado */}
        <div>
          <h1 className="text-3xl font-bold">Mi Perfil</h1>
          <p className="text-muted-foreground">
            Gestiona tu información personal y comunicación con tu psicólogo
          </p>
        </div>
        
        {/* Información del perfil */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Información personal</CardTitle>
            <CardDescription>
              Actualiza tu información personal y de contacto
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !isEditing ? (
              <div className="space-y-6">
                {userData?.profile_image && (
                  <div className="flex justify-center">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/30">
                      <img 
                        src={userData.profile_image} 
                        alt={userData.full_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">Email</h3>
                    <p className="text-muted-foreground">{userData?.email}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium">Nombre completo</h3>
                    <p className="text-muted-foreground">{userData?.full_name}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium">Teléfono</h3>
                    <p className="text-muted-foreground">{userData?.phone || "No especificado"}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium">Notas adicionales</h3>
                    <p className="text-muted-foreground whitespace-pre-line">
                      {userData?.notes || "No hay notas adicionales"}
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="mt-4"
                  >
                    Editar perfil
                  </Button>
                </div>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Introduce tu nombre completo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Introduce tu email" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input placeholder="Introduce tu número de teléfono" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas adicionales</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Información adicional que quieras compartir con tu psicólogo" 
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        "Guardar cambios"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
        
        {/* Aquí podrías añadir más secciones para pacientes en el futuro */}
        
      </div>
    </div>
  );
}