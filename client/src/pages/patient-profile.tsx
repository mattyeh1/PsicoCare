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
  psychologist_id?: number;
};

export default function PatientProfilePage(): React.ReactNode {
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
  
  // Log para depuración
  console.log("Intentando obtener datos del psicólogo con ID:", userData?.psychologist_id);
  
  // Obtener información del psicólogo asociado al paciente usando la ruta /api/my-psychologist
  const { data: psychologistData, isLoading: psychologistLoading, error: psychologistError } = useQuery<User>({
    queryKey: ["/api/my-psychologist"],
    enabled: userData?.user_type === 'patient',
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
  
  // Log para verificar que se está obteniendo correctamente el psicólogo
  React.useEffect(() => {
    console.log("Estado del psicólogo:", { 
      userData,
      psychologistData, 
      psychologistLoading, 
      psychologistError,
      userType: userData?.user_type
    });
  }, [userData, psychologistData, psychologistLoading, psychologistError]);
  
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
    <div className="container py-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-8">
        {/* Encabezado con diseño moderno */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl shadow-sm p-8 mb-4">
          <h1 className="text-3xl font-bold text-primary-800 mb-2">Mi Perfil</h1>
          <p className="text-muted-foreground text-lg">
            Gestiona tu información personal y comunicación con tu psicólogo
          </p>
        </div>
        
        {/* Contenido principal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Panel lateral */}
          <div className="col-span-1">
            <Card className="sticky top-8 overflow-hidden shadow-md border-primary/20">
              <div className="bg-gradient-to-b from-primary-50 to-white p-6 flex flex-col items-center">
                <div className="w-32 h-32 rounded-full bg-primary/10 border-4 border-primary/20 flex items-center justify-center overflow-hidden mb-4">
                  {userData?.profile_image ? (
                    <img 
                      src={userData.profile_image} 
                      alt={userData.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="bg-primary/10 w-full h-full flex items-center justify-center">
                      <span className="text-4xl font-semibold text-primary">
                        {userData?.full_name?.charAt(0) || "P"}
                      </span>
                    </div>
                  )}
                </div>
                <h2 className="text-xl font-semibold mb-1">{userData?.full_name || "Cargando..."}</h2>
                <p className="text-muted-foreground text-sm mb-4">{userData?.email}</p>
                
                {!isEditing && (
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="w-full"
                  >
                    Editar perfil
                  </Button>
                )}
              </div>
              
              <div className="p-4 border-t">
                <h3 className="font-medium text-sm uppercase tracking-wider text-muted-foreground mb-3">Estado de cuenta</h3>
                <div className="flex items-center gap-2 mb-2 text-emerald-600">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-sm">Cuenta activa</span>
                </div>
                {psychologistData ? (
                  <div className="mt-3 bg-white p-3 rounded-md border border-slate-100">
                    <h4 className="text-xs text-muted-foreground mb-1">Psicólogo asignado</h4>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {psychologistData.full_name?.charAt(0) || "P"}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{psychologistData.full_name}</p>
                        <p className="text-xs text-muted-foreground">{psychologistData.email}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Tu cuenta está vinculada a un profesional y funciona correctamente.
                  </p>
                )}
              </div>
            </Card>
          </div>
          
          {/* Información del perfil - Panel principal */}
          <Card className="col-span-1 md:col-span-2 overflow-hidden shadow-md border-primary/20">
            <CardHeader className="bg-white border-b">
              <CardTitle className="text-xl flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                Información personal
              </CardTitle>
              <CardDescription>
                Gestiona tus datos personales y de contacto
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {userLoading ? (
                <div className="flex justify-center items-center min-h-[300px]">
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Cargando información...</p>
                  </div>
                </div>
              ) : !isEditing ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 rounded-lg p-5 shadow-sm">
                      <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-3">Información básica</h3>
                      
                      <div className="space-y-4">
                        <div className="bg-white p-3 rounded-md border border-slate-100">
                          <h4 className="text-xs text-muted-foreground mb-1">Nombre completo</h4>
                          <p className="font-medium">{userData?.full_name}</p>
                        </div>
                        
                        <div className="bg-white p-3 rounded-md border border-slate-100">
                          <h4 className="text-xs text-muted-foreground mb-1">Email</h4>
                          <p className="font-medium">{userData?.email}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 rounded-lg p-5 shadow-sm">
                      <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-3">Contacto</h3>
                      
                      <div className="space-y-4">
                        <div className="bg-white p-3 rounded-md border border-slate-100">
                          <h4 className="text-xs text-muted-foreground mb-1">Teléfono</h4>
                          <p className="font-medium">{userData?.phone || "No especificado"}</p>
                        </div>
                        
                        <div className="bg-white p-3 h-full rounded-md border border-slate-100">
                          <h4 className="text-xs text-muted-foreground mb-1">Notas adicionales</h4>
                          <p className="font-medium whitespace-pre-line">{userData?.notes || "No hay notas adicionales"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
              <div className="bg-slate-50 p-6 rounded-lg shadow-sm">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-1">Información básica</h3>
                        
                        <FormField
                          control={form.control}
                          name="full_name"
                          render={({ field }) => (
                            <FormItem className="bg-white p-4 rounded-md border border-slate-100">
                              <FormLabel className="text-sm text-primary-700">Nombre completo</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Introduce tu nombre completo" 
                                  className="border-0 border-b rounded-none px-0 shadow-none focus-visible:ring-0 focus-visible:border-primary" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem className="bg-white p-4 rounded-md border border-slate-100">
                              <FormLabel className="text-sm text-primary-700">Email</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Introduce tu email" 
                                  type="email" 
                                  className="border-0 border-b rounded-none px-0 shadow-none focus-visible:ring-0 focus-visible:border-primary" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="space-y-4">
                        <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-1">Contacto</h3>
                        
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem className="bg-white p-4 rounded-md border border-slate-100">
                              <FormLabel className="text-sm text-primary-700">Teléfono</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Introduce tu número de teléfono" 
                                  className="border-0 border-b rounded-none px-0 shadow-none focus-visible:ring-0 focus-visible:border-primary" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem className="bg-white p-4 rounded-md border border-slate-100">
                              <FormLabel className="text-sm text-primary-700">Notas adicionales</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Información adicional que quieras compartir con tu psicólogo" 
                                  className="min-h-[100px] border-0 border-b rounded-none px-0 shadow-none focus-visible:ring-0 focus-visible:border-primary" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-3 mt-8">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full px-5"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        className="rounded-full px-5 shadow-md" 
                        disabled={isLoading}
                      >
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
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Aquí podrías añadir más secciones para pacientes en el futuro */}
        
      </div>
    </div>
  );
}