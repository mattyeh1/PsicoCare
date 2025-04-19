import { useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
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
import { Plus, Calendar, MessageSquare, FileText } from "lucide-react";

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
      }
    },
  });

  // Fetch patients
  const { data: patients, isLoading: patientsLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

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
      const res = await apiRequest("POST", "/api/patients", values);
      await res.json();
      
      toast({
        title: "Paciente agregado",
        description: "El paciente ha sido agregado correctamente.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      patientForm.reset();
      setIsAddingPatient(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo agregar el paciente. Inténtalo de nuevo.",
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
            Gestiona tu información profesional y tus pacientes
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">Información profesional</TabsTrigger>
            <TabsTrigger value="patients">Pacientes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Perfil profesional</CardTitle>
                    <CardDescription>
                      Actualiza tu información personal y profesional
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
              <CardContent>
                {isAddingPatient ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Agregar nuevo paciente</CardTitle>
                    </CardHeader>
                    <CardContent>
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
                ) : (
                  <DataTable 
                    columns={columns} 
                    data={patients || []} 
                    searchColumn="name"
                    searchPlaceholder="Buscar paciente..."
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
