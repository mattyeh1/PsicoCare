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
const patientFormSchema = z.object({
  name: z.string().min(3, {
    message: "El nombre del paciente debe tener al menos 3 caracteres.",
  }),
  email: z.string().email({
    message: "Ingresa un email válido.",
  }),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

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

  // Patient form
  const patientForm = useForm<z.infer<typeof patientFormSchema>>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      notes: "",
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
  const onSubmitPatient = async (values: z.infer<typeof patientFormSchema>) => {
    setIsLoading(true);
    try {
      // Añadir el ID del psicólogo explícitamente
      const patientData = {
        ...values,
        psychologist_id: user?.id
      };
      
      const res = await apiRequest("POST", "/api/patients", patientData);
      await res.json();
      
      toast({
        title: "Paciente agregado",
        description: "El paciente ha sido agregado correctamente.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
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
            <div className="bg-card rounded-xl shadow-md overflow-hidden border border-muted">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="p-6 md:p-8 md:w-3/5">
                  <h3 className="text-xl font-semibold mb-3">Código para tus pacientes</h3>
                  <p className="text-muted-foreground text-sm">
                    Comparte este código con tus pacientes para que puedan vincularse a tu consulta al registrarse.
                  </p>
                </div>
                <div className="bg-primary text-primary-foreground w-full md:w-2/5 p-6 md:p-8 flex flex-col items-center justify-center md:border-l border-primary-foreground/10">
                  <div className="flex flex-col items-center">
                    <div className="text-5xl font-mono tracking-[0.5em] pb-1 font-medium mb-4">
                      {userData.unique_code}
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-2 px-4 py-1 h-9"
                      onClick={() => {
                        navigator.clipboard.writeText(userData.unique_code);
                        toast({
                          title: "Código copiado",
                          description: "El código ha sido copiado al portapapeles",
                        });
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
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
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{isPsychologist ? "Perfil profesional" : "Perfil personal"}</CardTitle>
                    <CardDescription>
                      Actualiza tu información {isPsychologist ? "personal y profesional" : "personal"}
                    </CardDescription>
                  </div>
                  <Button 
                    variant={isEditing ? "outline" : "default"} 
                    onClick={() => setIsEditing(!isEditing)}
                    disabled={isLoading}
                  >
                    {isEditing ? "Cancelar" : "Editar perfil"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!isEditing ? (
                  // View mode
                  <div className="space-y-8">
                    <div className="flex flex-col md:flex-row gap-8">
                      {userData?.profile_image && (
                        <div className="flex-none">
                          <img 
                            src={userData.profile_image}
                            alt={userData.full_name}
                            className="w-48 h-48 object-cover rounded-lg"
                          />
                        </div>
                      )}
                      <div className="flex-grow space-y-4">
                        <h2 className="text-2xl font-bold font-serif">
                          <span className="block">{userData?.full_name}</span>
                          <span className="block text-primary-500">{userData?.specialty}</span>
                        </h2>
                        <p className="text-lg">{userData?.bio}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {isPsychologist && (
                        <>
                          <h3 className="text-lg font-semibold border-b pb-2">Educación y certificaciones</h3>
                          <div className="space-y-2">
                            {userData?.education && (
                              <div className="ml-4">
                                <p className="whitespace-pre-line">{userData.education}</p>
                              </div>
                            )}
                          </div>
                          
                          <h3 className="text-lg font-semibold border-b pb-2">Certificaciones</h3>
                          <div className="space-y-2">
                            {userData?.certifications && (
                              <div className="ml-4">
                                <p className="whitespace-pre-line">{userData.certifications}</p>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      
                      <h3 className="text-lg font-semibold border-b pb-2">Información de contacto</h3>
                      <div className="ml-4">
                        <p><strong>Email:</strong> {userData?.email}</p>
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
                          <form onSubmit={patientForm.handleSubmit(onSubmitPatient)} className="space-y-4">
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
                            
                            <div className="flex gap-2 justify-end pt-4">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddingPatient(false)}
                                disabled={isLoading}
                              >
                                Cancelar
                              </Button>
                              <Button 
                                type="submit"
                                disabled={isLoading}
                              >
                                {isLoading ? "Agregando..." : "Agregar paciente"}
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
                    <div className="flex justify-center items-center py-10">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    </div>
                  ) : patients && patients.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredPatients.map((patient) => (
                        <Card key={patient.id} className="overflow-hidden hover:shadow-md transition-shadow">
                          <div className="bg-primary/10 p-4">
                            <div className="flex items-center gap-4">
                              <div className="bg-primary/90 text-primary-foreground rounded-full h-12 w-12 flex items-center justify-center text-xl font-semibold">
                                {patient.name.substring(0, 1).toUpperCase()}
                              </div>
                              <div>
                                <h3 className="font-medium text-lg">{patient.name}</h3>
                                <p className="text-sm text-muted-foreground">{patient.created_at ? 
                                  `Desde ${format(new Date(patient.created_at), "MMM yyyy")}` : 
                                  "Paciente"}</p>
                              </div>
                            </div>
                          </div>
                          
                          <CardContent className="pt-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm">{patient.email}</p>
                              </div>
                              
                              {patient.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <p className="text-sm">{patient.phone}</p>
                                </div>
                              )}
                              
                              {patient.notes && (
                                <div className="flex items-start gap-2 mt-3">
                                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                                  <p className="text-sm text-muted-foreground line-clamp-2">{patient.notes}</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                          
                          <CardFooter className="border-t bg-muted/30 px-4 py-3">
                            <div className="flex items-center justify-between w-full">
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full h-8 px-3"
                                asChild
                              >
                                <a href={`/appointments?patient=${patient.id}`}>
                                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
                                  Citas
                                </a>
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full h-8 px-3"
                                asChild
                              >
                                <a href={`/messages?patient=${patient.id}`}>
                                  <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                                  Mensajes
                                </a>
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full h-8 px-3"
                                asChild
                              >
                                <a href={`/consent-forms?patient=${patient.id}`}>
                                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                                  Docs
                                </a>
                              </Button>
                            </div>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="bg-muted rounded-full p-3 mb-4">
                        <User className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium mb-1">No hay pacientes registrados</h3>
                      <p className="text-muted-foreground text-sm max-w-md">
                        Agrega un nuevo paciente para comenzar a gestionar su información, citas y documentos.
                      </p>
                      <Button 
                        onClick={() => setIsAddingPatient(true)} 
                        className="mt-6"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar paciente
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
