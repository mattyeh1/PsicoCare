import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Lock, Calendar, MessageSquare, FileText, UserPlus, Info, Copy, Plus, Search, Loader2, ShieldCheck } from "lucide-react";

// Tipos de datos para usuarios y pacientes
type User = {
  id: number;
  username: string;
  full_name: string;
  email: string;
  user_type: 'psychologist' | 'patient';
  specialty?: string;
  unique_code?: string;
  bio?: string;
  education?: string;
  certifications?: string;
  profile_image?: string;
};

type Patient = {
  id: number;
  psychologist_id: number;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  status: string;
};

// Esquema para formulario de perfil
const formSchema = z.object({
  full_name: z.string().min(3, {
    message: "El nombre debe tener al menos 3 caracteres.",
  }),
  email: z.string().email({
    message: "Email inválido.",
  }),
  specialty: z.string().optional(),
  bio: z.string().optional(),
  education: z.string().optional(),
  certifications: z.string().optional(),
  profile_image: z.string().optional(),
});

// Esquema para formulario de paciente
const simplePatientSchema = z.object({
  name: z.string().min(3, {
    message: "El nombre del paciente debe tener al menos 3 caracteres.",
  }),
  email: z.string().email({
    message: "Ingresa un email válido.",
  }),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

// Esquema extendido para creación de cuenta
const patientUserFormSchema = simplePatientSchema.extend({
  createAccount: z.boolean().default(false),
  username: z.string().optional()
    .refine(val => !val || val.length >= 4, {
      message: "El nombre de usuario debe tener al menos 4 caracteres"
    }),
  password: z.string().optional()
    .refine(val => !val || val.length >= 6, {
      message: "La contraseña debe tener al menos 6 caracteres"
    }),
  confirmPassword: z.string().optional(),
}).refine(
  (data) => {
    if (data.createAccount) {
      return !!data.username && !!data.password;
    }
    return true;
  },
  {
    message: "Nombre de usuario y contraseña son obligatorios para crear una cuenta",
    path: ["username", "password"],
  }
).refine(
  (data) => {
    if (data.createAccount && data.password) {
      return data.password === data.confirmPassword;
    }
    return true;
  },
  {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  }
);

export default function ProfilePage() {
  // Estado local
  const [isEditing, setIsEditing] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isAddingPatient, setIsAddingPatient] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Obtener toast
  const { toast } = useToast();

  // Formulario para perfil de usuario
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      email: "",
      specialty: "",
      bio: "",
      education: "",
      certifications: "",
      profile_image: "",
    },
  });

  // Fetch user profile data
  const { data: userData, isLoading: userLoading } = useQuery<any>({
    queryKey: ["/api/auth/me"]
  });
  
  // Determinar el tipo de usuario basado en los datos reales del usuario
  const isPsychologist = userData?.user_type === 'psychologist';
  
  // Actualizar formulario cuando se reciban los datos
  React.useEffect(() => {
    if (userData) {
      form.reset({
        full_name: userData.full_name || "",
        email: userData.email || "",
        specialty: userData.specialty || "",
        bio: userData.bio || "",
        education: userData.education || "",
        certifications: userData.certifications || "",
        profile_image: userData.profile_image || "",
      });
      // Log para depuración
      console.log("Datos de usuario recibidos:", JSON.stringify(userData, null, 2));
      console.log("Código de psicólogo:", userData.unique_code);
      console.log("Tipo de usuario:", userData.user_type);
    }
  }, [userData, form]);

  // Fetch patients solo si es psicólogo
  const { data: patients, isLoading: patientsLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
    enabled: isPsychologist, // Solo hacer esta consulta si el usuario es psicólogo
  });
  
  // Filtrar pacientes según el término de búsqueda
  const filteredPatients = patients?.filter(patient => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      patient.name.toLowerCase().includes(query) ||
      patient.email.toLowerCase().includes(query) ||
      (patient.phone && patient.phone.toLowerCase().includes(query)) ||
      (patient.notes && patient.notes.toLowerCase().includes(query))
    );
  }) || [];

  // Patient form
  const patientForm = useForm<z.infer<typeof patientUserFormSchema>>({
    resolver: zodResolver(patientUserFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      notes: "",
      username: "",
      password: "",
      confirmPassword: "",
      createAccount: false,
    },
  });

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
        description: "Tu información profesional ha sido actualizada correctamente.",
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

  // Submit patient form
  const onSubmitPatient = async (values: z.infer<typeof patientUserFormSchema>) => {
    setIsLoading(true);
    try {
      if (!userData?.id) {
        throw new Error("No se encontró información del usuario");
      }
      
      // Añadir el ID del psicólogo explícitamente
      const patientData = {
        name: values.name,
        email: values.email,
        phone: values.phone || "",
        notes: values.notes || "",
        psychologist_id: userData.id
      };
      
      // Si se marca la creación de cuenta, también creamos usuario
      if (values.createAccount) {
        // Primero creamos el usuario de tipo paciente
        const patientUserData = {
          username: values.username,
          password: values.password,
          email: values.email,
          full_name: values.name,
          user_type: 'patient',
          psychologist_id: userData.id,
          phone: values.phone || "",
          notes: values.notes || ""
        };
        
        // Enviar petición para crear usuario paciente
        const userRes = await apiRequest("POST", "/api/register/patient", patientUserData);
        const userJson = await userRes.json();
        
        if (!userRes.ok) {
          throw new Error(userJson.message || "Error al crear la cuenta de usuario");
        }
        
        toast({
          title: "Cuenta creada",
          description: "Se ha creado la cuenta de paciente con éxito",
        });
      } else {
        // Solo crear el paciente sin cuenta de usuario
        const res = await apiRequest("POST", "/api/patients", patientData);
        const jsonResponse = await res.json();
        
        if (!res.ok) {
          throw new Error("Error al crear el paciente");
        }
      }
      
      // Recargar la lista de pacientes
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      
      toast({
        title: "Paciente agregado",
        description: "El paciente ha sido agregado correctamente a tu lista de pacientes.",
      });
      
      // Resetear formulario y cerrar
      patientForm.reset();
      setIsAddingPatient(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo agregar el paciente. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Renderizado principal
  return (
    <div className="container py-8">
      <div className="flex flex-col gap-8">
        {/* Encabezado */}
        <div>
          <h1 className="text-3xl font-bold">Mi Perfil</h1>
          <p className="text-muted-foreground">
            {isPsychologist 
              ? "Gestiona tu información profesional y tus pacientes" 
              : "Gestiona tu información personal"}
          </p>
        </div>

        {/* Código único para psicólogos */}
        {userData?.user_type === 'psychologist' && userData?.unique_code && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-primary/20 to-primary/10 rounded-xl shadow-lg overflow-hidden">
              <div className="flex flex-col lg:flex-row gap-6 p-0">
                <div className="p-8 lg:p-10 lg:w-3/5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-primary/80 rounded-full p-2">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-primary-700">Código para tus pacientes</h3>
                  </div>
                  <p className="text-muted-foreground text-base max-w-lg">
                    Comparte este código único con tus pacientes para que puedan vincularse a tu consulta al momento de registrarse. Este código es exclusivo para ti.
                  </p>
                  <div className="flex items-center gap-2 mt-6">
                    <div className="bg-yellow-100 border-l-4 border-yellow-400 rounded-r p-3 flex items-center">
                      <div className="pl-3 pr-2">
                        <Info className="h-5 w-5 text-yellow-600" />
                      </div>
                      <p className="text-sm text-yellow-700">
                        Al registrarse con este código, los pacientes quedarán automáticamente asignados a tu consulta.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-primary to-primary-600 text-white w-full lg:w-2/5 p-10 flex flex-col items-center justify-center">
                  <div className="flex flex-col items-center">
                    <p className="uppercase tracking-wider text-sm mb-2 text-white/80">Tu código único</p>
                    <div className="text-5xl font-mono tracking-widest pb-1 font-semibold mb-6 bg-primary-950/10 px-10 py-6 rounded-lg shadow-inner">
                      {userData.unique_code}
                    </div>
                    <Button
                      variant="secondary"
                      size="lg"
                      className="mt-4 px-6 py-2 h-11 rounded-full shadow-md hover:shadow-lg transition-all"
                      onClick={() => {
                        navigator.clipboard.writeText(userData.unique_code);
                        toast({
                          title: "Código copiado",
                          description: "El código ha sido copiado al portapapeles",
                        });
                      }}
                    >
                      <Copy className="h-5 w-5 mr-2" />
                      Copiar código
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Pestañas de contenido */}
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">{isPsychologist ? "Información profesional" : "Información personal"}</TabsTrigger>
            {isPsychologist && <TabsTrigger value="patients">Pacientes</TabsTrigger>}
          </TabsList>
          
          {/* Pestaña de perfil */}
          <TabsContent value="profile" className="space-y-4">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Información de perfil</CardTitle>
                <CardDescription>
                  {isPsychologist 
                    ? "Actualiza tu información profesional y de contacto" 
                    : "Actualiza tu información personal y de contacto"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isEditing ? (
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
                      
                      {isPsychologist && (
                        <>
                          <div>
                            <h3 className="text-lg font-medium">Especialidad</h3>
                            <p className="text-muted-foreground">{userData?.specialty || "No especificada"}</p>
                          </div>
                          
                          <div>
                            <h3 className="text-lg font-medium">Biografía</h3>
                            <p className="text-muted-foreground whitespace-pre-line">
                              {userData?.bio || "No hay biografía"}
                            </p>
                          </div>
                          
                          <div>
                            <h3 className="text-lg font-medium">Educación</h3>
                            <p className="text-muted-foreground whitespace-pre-line">
                              {userData?.education || "No hay información de educación"}
                            </p>
                          </div>
                          
                          <div>
                            <h3 className="text-lg font-medium">Certificaciones</h3>
                            <p className="text-muted-foreground whitespace-pre-line">
                              {userData?.certifications || "No hay certificaciones"}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    
                    <div className="pt-4">
                      <Button onClick={() => setIsEditing(true)}>
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
                              <Input 
                                placeholder="Ingresa tu nombre completo"
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
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="tu@email.com"
                                {...field}
                                disabled={isLoading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {isPsychologist && (
                        <>
                          <FormField
                            control={form.control}
                            name="specialty"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Especialidad</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                  disabled={isLoading}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecciona tu especialidad" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Psicología Clínica">Psicología Clínica</SelectItem>
                                    <SelectItem value="Psicología Infantil">Psicología Infantil</SelectItem>
                                    <SelectItem value="Psicología Educativa">Psicología Educativa</SelectItem>
                                    <SelectItem value="Neuropsicología">Neuropsicología</SelectItem>
                                    <SelectItem value="Psicología Forense">Psicología Forense</SelectItem>
                                    <SelectItem value="Terapia Familiar">Terapia Familiar</SelectItem>
                                    <SelectItem value="Psicoanálisis">Psicoanálisis</SelectItem>
                                    <SelectItem value="Terapia Cognitivo-Conductual">Terapia Cognitivo-Conductual</SelectItem>
                                    <SelectItem value="Psicología Organizacional">Psicología Organizacional</SelectItem>
                                    <SelectItem value="Otra">Otra</SelectItem>
                                  </SelectContent>
                                </Select>
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
                                    placeholder="Escribe una breve biografía profesional"
                                    className="min-h-32"
                                    {...field}
                                    disabled={isLoading}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Comparte información sobre tu experiencia y enfoque terapéutico.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="education"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Educación</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Detalla tu formación académica"
                                    className="min-h-24"
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
                                    placeholder="Lista tus certificaciones profesionales"
                                    className="min-h-24"
                                    {...field}
                                    disabled={isLoading}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      )}
                      
                      <div className="flex justify-end space-x-4 pt-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsEditing(false)}
                          disabled={isLoading}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          type="submit"
                          disabled={isLoading}
                        >
                          {isLoading ? "Guardando..." : "Guardar cambios"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Pestaña de pacientes */}
          <TabsContent value="patients">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Mis pacientes</CardTitle>
                      <CardDescription>
                        Gestiona la información y archivos de tus pacientes
                      </CardDescription>
                    </div>
                    <Button 
                      onClick={() => setIsAddingPatient(true)}
                      disabled={isAddingPatient}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nuevo paciente
                    </Button>
                  </div>
                </CardHeader>
                
                {/* Formulario para agregar paciente - Versión simple */}
                {isAddingPatient && (
                  <CardContent>
                    <Card className="border-2 border-primary/20 bg-primary/5">
                      <CardHeader className="bg-primary/10">
                        <CardTitle className="flex items-center">
                          <UserPlus className="h-5 w-5 mr-2 text-primary" />
                          Agregar nuevo paciente
                        </CardTitle>
                        <CardDescription>
                          Añade un nuevo paciente a tu lista
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <Form {...patientForm}>
                          <form onSubmit={patientForm.handleSubmit(onSubmitPatient)} className="space-y-6">
                            {/* Datos básicos del paciente */}
                            <div className="space-y-4">
                              <FormField
                                control={patientForm.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Nombre completo</FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="Nombre del paciente"
                                        {...field}
                                        disabled={isLoading}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={patientForm.control}
                                name="email"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="paciente@email.com"
                                        {...field}
                                        disabled={isLoading}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={patientForm.control}
                                name="phone"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Teléfono (opcional)</FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="+54 11 1234 5678"
                                        {...field}
                                        disabled={isLoading}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={patientForm.control}
                                name="notes"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Notas (opcional)</FormLabel>
                                    <FormControl>
                                      <Textarea 
                                        placeholder="Notas relevantes sobre el paciente"
                                        className="min-h-24"
                                        {...field}
                                        disabled={isLoading}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            {/* Opción de crear cuenta */}
                            <FormField
                              control={patientForm.control}
                              name="createAccount"
                              render={({ field }) => (
                                <FormItem className="bg-muted/20 p-4 rounded-lg border">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <FormLabel className="text-base flex items-center gap-2">
                                        <Lock className="h-4 w-4 text-primary" />
                                        Crear cuenta de acceso
                                      </FormLabel>
                                      <FormDescription>
                                        Permite que el paciente acceda a su área personal
                                      </FormDescription>
                                    </div>
                                    <FormControl>
                                      <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        disabled={isLoading}
                                      />
                                    </FormControl>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            {/* Campos para cuenta de usuario */}
                            {patientForm.watch("createAccount") && (
                              <div className="space-y-4 p-4 border border-primary/20 rounded-lg bg-primary/5">
                                <FormField
                                  control={patientForm.control}
                                  name="username"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Nombre de usuario</FormLabel>
                                      <FormControl>
                                        <Input 
                                          placeholder="nombre_usuario123"
                                          {...field}
                                          disabled={isLoading}
                                        />
                                      </FormControl>
                                      <FormDescription>
                                        Mínimo 4 caracteres
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={patientForm.control}
                                  name="password"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Contraseña</FormLabel>
                                      <FormControl>
                                        <Input 
                                          type="password"
                                          placeholder="********"
                                          {...field}
                                          disabled={isLoading}
                                        />
                                      </FormControl>
                                      <FormDescription>
                                        Mínimo 6 caracteres
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={patientForm.control}
                                  name="confirmPassword"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Confirmar contraseña</FormLabel>
                                      <FormControl>
                                        <Input 
                                          type="password"
                                          placeholder="********"
                                          {...field}
                                          disabled={isLoading}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            )}
                            
                            <CardFooter className="flex justify-between px-0 pb-0">
                              <Button 
                                type="button" 
                                variant="ghost" 
                                onClick={() => setIsAddingPatient(false)}
                              >
                                Cancelar
                              </Button>
                              <Button type="submit" disabled={isLoading}>
                                {isLoading ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Procesando...
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Añadir paciente
                                  </>
                                )}
                              </Button>
                            </CardFooter>
                          </form>
                        </Form>
                      </CardContent>
                    </Card>
                  </CardContent>
                )}
                
                <CardContent>
                  {/* Barra de búsqueda */}
                  <div className="flex items-center space-x-2 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar pacientes por nombre, email o notas..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button variant="outline" onClick={() => setSearchQuery("")} disabled={!searchQuery}>
                      Limpiar
                    </Button>
                  </div>
                  
                  {/* Lista de pacientes */}
                  {patientsLoading ? (
                    <div className="flex justify-center items-center py-20">
                      <div className="relative">
                        <Loader2 className="h-12 w-12 animate-spin text-primary/60" />
                      </div>
                    </div>
                  ) : (
                    <div>
                      {filteredPatients.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="flex justify-center">
                            <div className="bg-muted/50 p-4 rounded-full">
                              <User className="h-12 w-12 text-muted-foreground" />
                            </div>
                          </div>
                          <h3 className="mt-4 text-lg font-medium">No se encontraron pacientes</h3>
                          <p className="text-muted-foreground mt-2">
                            {searchQuery 
                              ? "No hay pacientes que coincidan con tu búsqueda" 
                              : "Añade tu primer paciente para comenzar"}
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredPatients.map((patient) => (
                            <Card key={patient.id} className="overflow-hidden hover:shadow-md transition-shadow">
                              <CardHeader className="bg-muted/20 py-4 px-5">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <CardTitle className="text-base">{patient.name}</CardTitle>
                                    <CardDescription className="text-xs mt-0.5">{patient.email}</CardDescription>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="p-5 pt-4">
                                {patient.phone && (
                                  <p className="text-sm mb-2 flex items-center gap-2">
                                    <span className="text-muted-foreground">Teléfono:</span> 
                                    {patient.phone}
                                  </p>
                                )}
                                {patient.notes && (
                                  <div className="mb-4">
                                    <p className="text-sm text-muted-foreground mb-1">Notas:</p>
                                    <p className="text-sm bg-muted/20 p-2 rounded text-muted-foreground">
                                      {patient.notes.length > 100 
                                        ? `${patient.notes.substring(0, 100)}...` 
                                        : patient.notes}
                                    </p>
                                  </div>
                                )}
                              </CardContent>
                              <CardFooter className="border-t p-3 flex gap-2 justify-end">
                                <Button variant="outline" size="sm" asChild>
                                  <a href={`/appointments?patient=${patient.id}`}>
                                    <Calendar className="h-4 w-4 mr-1.5" />
                                    Citas
                                  </a>
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                  <a href={`/messages?patient=${patient.id}`}>
                                    <MessageSquare className="h-4 w-4 mr-1.5" />
                                    Mensajes
                                  </a>
                                </Button>
                              </CardFooter>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}