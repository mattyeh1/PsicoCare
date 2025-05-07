import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SelectItem } from "@/components/ui/select-item";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Patient } from "@shared/schema";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { 
  Plus, 
  Calendar, 
  MessageSquare, 
  FileText, 
  Edit, 
  Copy, 
  User, 
  Phone, 
  Mail, 
  Search,
  Info,
  AlertCircle
} from "lucide-react";

// Form schema for profile update
const formSchema = z.object({
  full_name: z.string().min(3, {
    message: "El nombre completo debe tener al menos 3 caracteres.",
  }),
  email: z.string().email({
    message: "Ingresa un email válido.",
  }),
  specialty: z.string().min(1, {
    message: "Selecciona una especialidad.",
  }),
  bio: z.string().optional(),
  education: z.string().optional(),
  certifications: z.string().optional(),
  profile_image: z.string().optional(),
});

// Patient form schema
const patientUserFormSchema = z.object({
  name: z.string().min(3, {
    message: "El nombre del paciente debe tener al menos 3 caracteres.",
  }),
  email: z.string().email({
    message: "Ingresa un email válido.",
  }),
  phone: z.string().optional(),
  notes: z.string().optional(),
  // Campos para la creación de cuenta
  createAccount: z.boolean().default(false),
  username: z.string().optional()
    .refine(val => !val || val.length >= 4, {
      message: "El nombre de usuario debe tener al menos 4 caracteres"
    }),
  password: z.string().optional()
    .refine(val => !val || val.length >= 6, {
      message: "La contraseña debe tener al menos 6 caracteres"
    }),
}).refine(
  // Si createAccount es true, los campos username y password son obligatorios
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
);

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const isPsychologist = user?.user_type === 'psychologist';

  // Fetch user profile data
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    onSuccess: (data) => {
      if (data) {
        form.reset({
          full_name: data.full_name,
          email: data.email,
          specialty: data.specialty,
          bio: data.bio || "",
          education: data.education || "",
          certifications: data.certifications || "",
          profile_image: data.profile_image || "",
        });
        // Log para depuración
        console.log("Datos de usuario recibidos:", JSON.stringify(data, null, 2));
        console.log("Código de psicólogo:", data.unique_code);
        console.log("Tipo de usuario:", data.user_type);
      }
    },
  });

  // Fetch patients
  const { data: patients, isLoading: patientsLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
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

  // Profile form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: user?.full_name || "",
      email: user?.email || "",
      specialty: user?.specialty || "",
      bio: "",
      education: "",
      certifications: "",
      profile_image: "",
    },
  });

  // Extendemos el esquema para incluir validación de contraseña coincidente
  const patientUserFormSchema = z.object({
    name: z.string().min(3, {
      message: "El nombre del paciente debe tener al menos 3 caracteres.",
    }),
    email: z.string().email({
      message: "Ingresa un email válido.",
    }),
    phone: z.string().optional(),
    notes: z.string().optional(),
    // Campos para la creación de cuenta
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
    // Si createAccount es true, los campos username y password son obligatorios
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
    // Si createAccount es true, las contraseñas deben coincidir
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
      const res = await apiRequest("PUT", `/api/users/${user?.id}`, values);
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
      // Verificar autenticación del usuario
      if (!user?.id) {
        toast({
          title: "Error de sesión",
          description: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
          variant: "destructive",
        });
        return;
      }
      
      console.log("Usuario actual:", user.id, user.username);
      
      // Añadir el ID del psicólogo explícitamente
      const patientData = {
        name: values.name,
        email: values.email,
        phone: values.phone || "",
        notes: values.notes || "",
        psychologist_id: user.id
      };
      
      console.log("Enviando datos de paciente:", {...patientData, psychologist_id: user.id});
      
      // Si se marca la creación de cuenta, también creamos usuario
      if (values.createAccount) {
        console.log("Creando cuenta de usuario para el paciente");
        
        // Primero creamos el usuario de tipo paciente
        const userData = {
          username: values.username,
          password: values.password,
          email: values.email,
          full_name: values.name,
          user_type: 'patient',
          psychologist_id: user.id,
          phone: values.phone || "",
          notes: values.notes || ""
        };
        
        // Enviar petición para crear usuario paciente con timeout
        try {
          console.log("Enviando solicitud a /api/register/patient");
          const userRes = await Promise.race([
            apiRequest("POST", "/api/register/patient", userData),
            new Promise<Response>((_, reject) => 
              setTimeout(() => reject(new Error("Tiempo de espera agotado")), 10000)
            ) as Promise<Response>
          ]);
          
          console.log("Respuesta recibida:", userRes.status);
          const userJson = await userRes.json();
          
          if (!userRes.ok) {
            throw new Error(userJson.message || "Error al crear la cuenta de usuario");
          }
          
          console.log("Cuenta creada exitosamente:", userJson);
          
          toast({
            title: "Cuenta creada",
            description: "Se ha creado la cuenta de paciente con éxito",
          });
        } catch (err) {
          console.error("Error creando cuenta:", err);
          throw err;
        }
      } else {
        // Solo crear el paciente sin cuenta de usuario
        console.log("Creando solo ficha de paciente (sin cuenta de usuario)");
        try {
          const res = await apiRequest("POST", "/api/patients", patientData);
          const jsonResponse = await res.json();
          console.log("Paciente creado:", jsonResponse);
          
          if (!res.ok) {
            throw new Error("Error al crear el paciente");
          }
        } catch (err) {
          console.error("Error creando paciente:", err);
          throw err;
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
      console.error("Error en submit:", error);
      
      toast({
        title: "Error",
        description: error.message || "No se pudo agregar el paciente. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Columns for patients table
  const columns: ColumnDef<Patient>[] = [
    {
      accessorKey: "name",
      header: "Nombre",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "phone",
      header: "Teléfono",
      cell: ({ row }) => {
        return row.getValue("phone") || "No disponible";
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const patient = row.original;
        
        return (
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" asChild>
              <a href={`/appointments?patient=${patient.id}`}>
                <Calendar className="h-4 w-4 mr-1" />
                <span className="sr-only md:not-sr-only md:ml-1">Citas</span>
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={`/messages?patient=${patient.id}`}>
                <MessageSquare className="h-4 w-4 mr-1" />
                <span className="sr-only md:not-sr-only md:ml-1">Mensajes</span>
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={`/consent-forms?patient=${patient.id}`}>
                <FileText className="h-4 w-4 mr-1" />
                <span className="sr-only md:not-sr-only md:ml-1">Consentimientos</span>
              </a>
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="container py-8">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold">Mi Perfil</h1>
          <p className="text-muted-foreground">
            {isPsychologist 
              ? "Gestiona tu información profesional y tus pacientes" 
              : "Gestiona tu información personal"}
          </p>
        </div>

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
        
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">{isPsychologist ? "Información profesional" : "Información personal"}</TabsTrigger>
            {isPsychologist && <TabsTrigger value="patients">Pacientes</TabsTrigger>}
          </TabsList>
          
          <TabsContent value="profile" className="space-y-4">
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 pb-6 border-b">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="bg-primary/20 p-1.5 rounded-md">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle>{isPsychologist ? "Perfil profesional" : "Perfil personal"}</CardTitle>
                    </div>
                    <CardDescription className="mt-1.5">
                      Actualiza tu información {isPsychologist ? "personal y profesional" : "personal"}
                    </CardDescription>
                  </div>
                  <Button 
                    variant={isEditing ? "outline" : "default"} 
                    onClick={() => setIsEditing(!isEditing)}
                    disabled={isLoading}
                    className="self-start md:self-auto rounded-full px-5"
                  >
                    <Edit className={`h-4 w-4 mr-2 ${isEditing ? "hidden" : "inline"}`} />
                    {isEditing ? "Cancelar" : "Editar perfil"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-8">
                {!isEditing ? (
                  // View mode
                  <div className="space-y-8">
                    <div className="flex flex-col md:flex-row gap-8">
                      <div className="md:w-1/3 lg:w-1/4 flex-none">
                        {userData?.profile_image ? (
                          <img 
                            src={userData.profile_image}
                            alt={userData.full_name}
                            className="w-full max-w-[200px] aspect-square object-cover rounded-lg shadow-md mx-auto"
                          />
                        ) : (
                          <div className="w-full max-w-[200px] aspect-square bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                            <User className="h-20 w-20 text-primary/50" />
                          </div>
                        )}
                        
                        {/* Información de contacto en móvil */}
                        <div className="mt-6 p-4 bg-muted/40 rounded-lg md:hidden">
                          <h3 className="text-base font-semibold border-b border-muted pb-2 mb-3 flex items-center gap-2">
                            <Mail className="h-4 w-4" /> 
                            Información de contacto
                          </h3>
                          <p className="flex items-center gap-2 text-sm">
                            <span className="font-medium">Email:</span> 
                            <span className="text-muted-foreground">{userData?.email}</span>
                          </p>
                        </div>
                      </div>
                      
                      <div className="md:w-2/3 lg:w-3/4 flex-grow space-y-6">
                        <div className="pb-4 border-b border-muted">
                          <h2 className="text-2xl font-bold mb-1">
                            {userData?.full_name || "Nombre completo"}
                          </h2>
                          {isPsychologist && (
                            <div className="flex items-center gap-2 mt-1.5">
                              <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary font-medium px-3 py-1">
                                {userData?.specialty || "Especialidad"}
                              </Badge>
                            </div>
                          )}
                          
                          {userData?.bio && (
                            <div className="mt-4 text-muted-foreground">
                              <p className="leading-relaxed">{userData.bio}</p>
                            </div>
                          )}
                        </div>
                        
                        {isPsychologist && (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-3">
                              <h3 className="text-lg font-semibold flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary/70" /> 
                                Educación
                              </h3>
                              <div className="bg-muted/30 rounded-lg p-4">
                                {userData?.education ? (
                                  <p className="text-sm whitespace-pre-line">{userData.education}</p>
                                ) : (
                                  <p className="text-sm text-muted-foreground italic">No hay información de educación disponible</p>
                                )}
                              </div>
                            </div>
                            
                            <div className="space-y-3">
                              <h3 className="text-lg font-semibold flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary/70" /> 
                                Certificaciones
                              </h3>
                              <div className="bg-muted/30 rounded-lg p-4">
                                {userData?.certifications ? (
                                  <p className="text-sm whitespace-pre-line">{userData.certifications}</p>
                                ) : (
                                  <p className="text-sm text-muted-foreground italic">No hay certificaciones disponibles</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Información de contacto en desktop */}
                        <div className="hidden md:block p-4 bg-muted/40 rounded-lg mt-8">
                          <h3 className="text-base font-semibold border-b border-muted pb-2 mb-3 flex items-center gap-2">
                            <Mail className="h-4 w-4" /> 
                            Información de contacto
                          </h3>
                          <p className="flex items-center gap-2">
                            <span className="font-medium">Email:</span> 
                            <span className="text-muted-foreground">{userData?.email}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Edit mode
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                                    <SelectItem value="Psicoterapia">Psicoterapia</SelectItem>
                                    <SelectItem value="Neuropsicología">Neuropsicología</SelectItem>
                                    <SelectItem value="Psicología Infantil">Psicología Infantil</SelectItem>
                                    <SelectItem value="Otra especialidad">Otra especialidad</SelectItem>
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
                                    placeholder="Escribe una breve descripción profesional"
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
                                    placeholder="Lista tus certificaciones o especializaciones"
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
                      
                      <FormField
                        control={form.control}
                        name="profile_image"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL de imagen de perfil</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="https://ejemplo.com/imagen.jpg"
                                {...field}
                                disabled={isLoading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex gap-2 justify-end pt-4">
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
                
                {/* Formulario para agregar paciente */}
                {isAddingPatient && (
                  <CardContent>
                    <Card className="border-2 border-primary/20 bg-primary/5">
                      <CardHeader className="bg-primary/10">
                        <CardTitle className="flex items-center">
                          <User className="h-5 w-5 mr-2 text-primary" />
                          Agregar nuevo paciente
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <Form {...patientForm}>
                          <form onSubmit={patientForm.handleSubmit(onSubmitPatient)} className="space-y-6">
                            {/* Datos básicos del paciente */}
                            <div>
                              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary/70" /> 
                                Información del paciente
                              </h3>
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
                                          className="rounded-md"
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
                                          className="rounded-md"
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
                                          className="rounded-md"
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
                                          className="min-h-24 rounded-md"
                                          {...field}
                                          disabled={isLoading}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                            
                            {/* Sección de creación de cuenta */}
                            <div className="pt-4 border-t border-muted/60">
                              <FormField
                                control={patientForm.control}
                                name="createAccount"
                                render={({ field }) => (
                                  <FormItem className="space-y-3">
                                    <div className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/20">
                                      <div className="space-y-1 leading-none">
                                        <FormLabel className="flex items-center gap-2 text-base">
                                          <Lock className="h-4 w-4 text-primary" />
                                          Crear cuenta de usuario para el paciente
                                        </FormLabel>
                                        <FormDescription>
                                          Si activas esta opción, se creará una cuenta para que el paciente pueda acceder directamente a su información y gestionar sus citas.
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
                              
                              {patientForm.watch("createAccount") && (
                                <div className="mt-6 p-6 border border-primary/20 rounded-lg bg-primary/5">
                                  <h4 className="text-base font-medium mb-4 flex items-center gap-2">
                                    <UserPlus className="h-4 w-4 text-primary" />
                                    Datos de acceso para el paciente
                                  </h4>
                                  
                                  <div className="space-y-4">
                                    <FormField
                                      control={patientForm.control}
                                      name="username"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>
                                            <span className="flex items-center gap-2">
                                              <User className="h-3.5 w-3.5" />
                                              Nombre de usuario
                                            </span>
                                          </FormLabel>
                                          <FormControl>
                                            <Input 
                                              placeholder="Ej: paciente_silva123"
                                              {...field}
                                              disabled={isLoading}
                                              className="rounded-md"
                                            />
                                          </FormControl>
                                          <FormDescription className="text-xs">
                                            Solo letras, números y guiones bajos
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
                                          <FormLabel>
                                            <span className="flex items-center gap-2">
                                              <Lock className="h-3.5 w-3.5" />
                                              Contraseña
                                            </span>
                                          </FormLabel>
                                          <FormControl>
                                            <Input 
                                              type="password"
                                              placeholder="Contraseña segura"
                                              {...field}
                                              disabled={isLoading}
                                              className="rounded-md"
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  
                                    <FormField
                                      control={patientForm.control}
                                      name="confirmPassword"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>
                                            <span className="flex items-center gap-2">
                                              <ShieldCheck className="h-3.5 w-3.5" />
                                              Confirmar contraseña
                                            </span>
                                          </FormLabel>
                                          <FormControl>
                                            <Input 
                                              type="password"
                                              placeholder="Confirme la contraseña"
                                              {...field}
                                              disabled={isLoading}
                                              className="rounded-md"
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                  
                                  <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                                    <div className="flex items-start gap-3">
                                      <div>
                                        <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-yellow-700">
                                          Información importante
                                        </p>
                                        <p className="text-sm text-yellow-600 mt-1">
                                          Al crear una cuenta para el paciente, este estará automáticamente vinculado a tu consulta. Podrá acceder a su propio panel para gestionar citas y comunicarse contigo.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex gap-2 justify-end pt-4">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddingPatient(false)}
                                disabled={isLoading}
                                className="rounded-full px-4"
                              >
                                Cancelar
                              </Button>
                              <Button 
                                type="submit"
                                disabled={isLoading}
                                className="rounded-full px-6"
                              >
                                {isLoading ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Guardando...
                                  </>
                                ) : (
                                  <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Guardar paciente
                                  </>
                                )}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </CardContent>
                    </Card>
                  </CardContent>
                )}
              </Card>
              
              {/* Barra de búsqueda */}
              {!isAddingPatient && (
                <div className="flex items-center gap-2 max-w-md mx-auto">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Buscar paciente por nombre o email..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              )}
              
              {/* Lista de pacientes en tarjetas */}
              {!isAddingPatient && (
                <div>
                  {patientsLoading ? (
                    <div className="flex justify-center items-center py-20">
                      <div className="relative">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary/70" />
                        </div>
                      </div>
                    </div>
                  ) : patients && patients.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredPatients.map((patient) => (
                        <Card 
                          key={patient.id} 
                          className="overflow-hidden group hover:shadow-lg transition-all duration-300 border border-muted/50 hover:border-primary/20"
                        >
                          <div className="bg-gradient-to-r from-primary/15 to-primary/5 p-5 relative">
                            <div className="flex items-center gap-4">
                              <div className="bg-gradient-to-br from-primary/80 to-primary-600/80 text-white rounded-full h-14 w-14 flex items-center justify-center text-xl font-semibold shadow-sm group-hover:shadow-md transition-shadow">
                                {patient.name.substring(0, 1).toUpperCase()}
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg text-primary-900">{patient.name}</h3>
                                <div className="flex items-center text-sm text-muted-foreground">
                                  <Calendar className="h-3.5 w-3.5 mr-1.5 opacity-70" />
                                  {patient.created_at ? 
                                    `Desde ${format(new Date(patient.created_at), "MMMM yyyy")}` : 
                                    "Paciente"}
                                </div>
                              </div>
                            </div>
                            
                            {/* Badge flotante */}
                            <div className="absolute top-3 right-3">
                              <Badge 
                                variant="outline" 
                                className="bg-white/80 font-medium text-xs border-primary/20 px-2.5 py-0.5"
                              >
                                Paciente
                              </Badge>
                            </div>
                          </div>
                          
                          <CardContent className="p-5">
                            <div className="space-y-3">
                              <div className="flex items-center gap-3 pb-2 border-b border-muted/70">
                                <div className="bg-primary/10 rounded-full p-1.5">
                                  <Mail className="h-4 w-4 text-primary/70" />
                                </div>
                                <p className="text-sm font-medium text-primary-900">{patient.email}</p>
                              </div>
                              
                              {patient.phone && (
                                <div className="flex items-center gap-3">
                                  <div className="bg-primary/10 rounded-full p-1.5">
                                    <Phone className="h-4 w-4 text-primary/70" />
                                  </div>
                                  <p className="text-sm">{patient.phone}</p>
                                </div>
                              )}
                              
                              {patient.notes && (
                                <div className="pt-2 mt-2 border-t border-muted">
                                  <div className="flex items-start gap-3">
                                    <div className="bg-yellow-100 rounded-full p-1.5 mt-0.5">
                                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium text-yellow-700 mb-1">Notas importantes</p>
                                      <p className="text-sm text-muted-foreground line-clamp-2">{patient.notes}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                          
                          <div className="px-5 pb-5">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                className="rounded-full h-9 px-4 bg-primary/90 hover:bg-primary flex-1"
                                asChild
                              >
                                <a href={`/appointments?patient=${patient.id}`}>
                                  <Calendar className="h-4 w-4 mr-2" />
                                  Citas
                                </a>
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full h-9 px-4 border-primary/20 text-primary-700 hover:bg-primary/10 flex-1"
                                asChild
                              >
                                <a href={`/messages?patient=${patient.id}`}>
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Mensajes
                                </a>
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full h-9 px-4 border-primary/20 text-primary-700 hover:bg-primary/10 flex-1"
                                asChild
                              >
                                <a href={`/consent-forms?patient=${patient.id}`}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Documentos
                                </a>
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-muted/10 rounded-lg border border-dashed border-muted">
                      <div className="relative">
                        <div className="bg-muted/20 rounded-full p-6 mb-4 group-hover:bg-primary/5 transition-colors">
                          <User className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <div className="absolute bottom-3 right-2 bg-primary rounded-full p-1.5 shadow-sm">
                          <Plus className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <h3 className="text-xl font-semibold mb-2">No hay pacientes registrados</h3>
                      <p className="text-muted-foreground text-base max-w-md mb-8">
                        Agrega un nuevo paciente para comenzar a gestionar su información, citas y documentos en tu plataforma de gestión profesional.
                      </p>
                      <Button 
                        onClick={() => setIsAddingPatient(true)} 
                        className="rounded-full px-6 py-2 h-11"
                        size="lg"
                      >
                        <Plus className="h-5 w-5 mr-2" />
                        Agregar mi primer paciente
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
