import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Copy, MessageSquare } from "lucide-react";
import { MessageTemplate, Patient } from "@shared/schema";
import MessageTemplates from "@/components/messaging/MessageTemplates";

// Form schema for creating message templates
const templateFormSchema = z.object({
  type: z.string().min(1, {
    message: "Por favor selecciona un tipo de mensaje.",
  }),
  title: z.string().min(3, {
    message: "El título debe tener al menos 3 caracteres.",
  }),
  content: z.string().min(10, {
    message: "El contenido debe tener al menos 10 caracteres.",
  }),
});

// Form schema for sending messages
const messageFormSchema = z.object({
  patient_id: z.string().min(1, {
    message: "Por favor selecciona un paciente.",
  }),
  template_id: z.string().min(1, {
    message: "Por favor selecciona una plantilla.",
  }),
  subject: z.string().min(3, {
    message: "El asunto debe tener al menos 3 caracteres.",
  }),
  message: z.string().min(10, {
    message: "El mensaje debe tener al menos 10 caracteres.",
  }),
});

const Messages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch message templates
  const { data: templates, isLoading: templatesLoading } = useQuery<MessageTemplate[]>({
    queryKey: ["/api/message-templates"],
  });

  // Fetch patients
  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  // Template form
  const templateForm = useForm<z.infer<typeof templateFormSchema>>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      type: "",
      title: "",
      content: "",
    },
  });

  // Message form
  const messageForm = useForm<z.infer<typeof messageFormSchema>>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: {
      patient_id: "",
      template_id: "",
      subject: "",
      message: "",
    },
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/message-templates", data);
    },
    onSuccess: () => {
      toast({
        title: "Plantilla creada",
        description: "La plantilla de mensaje ha sido creada exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/message-templates"] });
      setIsCreatingTemplate(false);
      templateForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear la plantilla. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  // Handle template selection for composing message
  const handleSelectTemplate = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    
    // Update the message form with the template content
    messageForm.setValue("template_id", template.id.toString());
    messageForm.setValue("subject", template.title);
    
    // Replace placeholders with actual values if possible
    let content = template.content;
    if (user) {
      content = content.replace(/\[nombre_doctor\]/g, user.full_name);
    }
    
    messageForm.setValue("message", content);
  };

  // Submit template form
  const onSubmitTemplate = async (values: z.infer<typeof templateFormSchema>) => {
    const templateData = {
      ...values,
      psychologist_id: user?.id,
    };
    
    createTemplateMutation.mutate(templateData);
  };

  // Submit message form (this would connect to an email service in a real application)
  const onSubmitMessage = async (values: z.infer<typeof messageFormSchema>) => {
    setIsLoading(true);
    
    try {
      // This is where you would call the API to send the message
      // Since we don't have an actual email-sending API, we'll just show a success message
      
      setTimeout(() => {
        toast({
          title: "Mensaje enviado",
          description: "Tu mensaje ha sido enviado exitosamente.",
        });
        setIsComposing(false);
        messageForm.reset();
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje. Inténtalo de nuevo.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  // Get patient name by id
  const getPatientName = (patientId: string) => {
    const patient = patients?.find(p => p.id === parseInt(patientId));
    return patient ? patient.name : 'Paciente desconocido';
  };

  // Replace placeholders in the message content
  const processMessage = (content: string, patientId: string) => {
    let processedContent = content;
    
    if (user) {
      processedContent = processedContent.replace(/\[nombre_doctor\]/g, user.full_name);
    }
    
    const patient = patients?.find(p => p.id === parseInt(patientId));
    if (patient) {
      processedContent = processedContent.replace(/\[nombre_paciente\]/g, patient.name);
    }
    
    // Date and time placeholders
    const now = new Date();
    const formattedDate = now.toLocaleDateString('es-ES', { 
      day: '2-digit', month: 'long', year: 'numeric' 
    });
    const formattedTime = now.toLocaleTimeString('es-ES', { 
      hour: '2-digit', minute: '2-digit' 
    });
    
    processedContent = processedContent
      .replace(/\[fecha\]/g, formattedDate)
      .replace(/\[hora\]/g, formattedTime);
    
    return processedContent;
  };

  return (
    <div className="container py-8">
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Mensajes</h1>
            <p className="text-muted-foreground">
              Gestiona tus plantillas de mensajes y envía comunicaciones a tus pacientes
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCreatingTemplate(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva plantilla
            </Button>
            <Button
              onClick={() => setIsComposing(true)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Componer mensaje
            </Button>
          </div>
        </div>

        {/* Create template dialog */}
        <Dialog open={isCreatingTemplate} onOpenChange={setIsCreatingTemplate}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Crear nueva plantilla de mensaje</DialogTitle>
              <DialogDescription>
                Crea una plantilla personalizada para tus comunicaciones
              </DialogDescription>
            </DialogHeader>
            <Form {...templateForm}>
              <form onSubmit={templateForm.handleSubmit(onSubmitTemplate)} className="space-y-4">
                <FormField
                  control={templateForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de mensaje</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="appointment_reminder">Recordatorio de cita</SelectItem>
                          <SelectItem value="follow_up">Seguimiento</SelectItem>
                          <SelectItem value="welcome">Bienvenida</SelectItem>
                          <SelectItem value="cancellation">Cancelación</SelectItem>
                          <SelectItem value="rescheduling">Reprogramación</SelectItem>
                          <SelectItem value="custom">Personalizado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={templateForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ej: Recordatorio de cita"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={templateForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contenido</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Escribe el contenido de tu plantilla. Puedes usar [nombre_paciente], [nombre_doctor], [fecha_cita], [hora_cita] como marcadores."
                          className="min-h-40 font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    type="button"
                    onClick={() => setIsCreatingTemplate(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createTemplateMutation.isPending}>
                    {createTemplateMutation.isPending ? "Creando..." : "Crear plantilla"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Compose message dialog */}
        <Dialog open={isComposing} onOpenChange={setIsComposing}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Componer mensaje</DialogTitle>
              <DialogDescription>
                Envía un mensaje personalizado a tu paciente
              </DialogDescription>
            </DialogHeader>
            <Form {...messageForm}>
              <form onSubmit={messageForm.handleSubmit(onSubmitMessage)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={messageForm.control}
                    name="patient_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Paciente</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Update message content with patient name if template is selected
                            if (messageForm.getValues("template_id")) {
                              const content = messageForm.getValues("message");
                              messageForm.setValue(
                                "message", 
                                processMessage(content, value)
                              );
                            }
                          }} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un paciente" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {patients?.map((patient) => (
                              <SelectItem key={patient.id} value={patient.id.toString()}>
                                {patient.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={messageForm.control}
                    name="template_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plantilla</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            const template = templates?.find(t => t.id === parseInt(value));
                            if (template) {
                              handleSelectTemplate(template);
                            }
                          }} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona una plantilla" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {templates?.map((template) => (
                              <SelectItem key={template.id} value={template.id.toString()}>
                                {template.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={messageForm.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asunto</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Asunto del mensaje"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={messageForm.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensaje</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Escribe tu mensaje"
                          className="min-h-40"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {messageForm.getValues("patient_id") && (
                  <div className="bg-primary-50 p-4 rounded-md">
                    <h4 className="text-sm font-medium text-primary-900 mb-2">Vista previa personalizada:</h4>
                    <div className="text-sm whitespace-pre-line text-primary-800">
                      {processMessage(messageForm.getValues("message"), messageForm.getValues("patient_id"))}
                    </div>
                  </div>
                )}
                
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    type="button"
                    onClick={() => setIsComposing(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Enviando..." : "Enviar mensaje"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Tabs defaultValue="templates" className="space-y-4">
          <TabsList>
            <TabsTrigger value="templates">Mis plantillas</TabsTrigger>
            <TabsTrigger value="help">Consejos para mensajes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="templates">
            {templatesLoading ? (
              <div className="text-center py-12">Cargando plantillas...</div>
            ) : (
              <MessageTemplates 
                templates={templates || []} 
                onSelectTemplate={handleSelectTemplate}
                onComposeMessage={() => setIsComposing(true)}
              />
            )}
          </TabsContent>
          
          <TabsContent value="help">
            <Card>
              <CardHeader>
                <CardTitle>Consejos para comunicarte efectivamente</CardTitle>
                <CardDescription>
                  Recomendaciones para mantener una comunicación clara y empática con tus pacientes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Elementos clave para tus mensajes</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Siempre personaliza tus mensajes utilizando el nombre del paciente</li>
                    <li>Incluye información clara sobre fecha, hora y duración de las citas</li>
                    <li>Proporciona instrucciones específicas sobre cómo proceder (confirmación, cancelación, etc.)</li>
                    <li>Finaliza con una despedida cálida y tu nombre</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Marcadores disponibles</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Puedes usar estos marcadores en tus plantillas para personalizar automáticamente los mensajes:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="bg-muted p-2 rounded text-sm font-mono">[nombre_paciente]</div>
                    <div className="text-sm">Nombre del paciente seleccionado</div>
                    <div className="bg-muted p-2 rounded text-sm font-mono">[nombre_doctor]</div>
                    <div className="text-sm">Tu nombre como profesional</div>
                    <div className="bg-muted p-2 rounded text-sm font-mono">[fecha]</div>
                    <div className="text-sm">Fecha actual en formato largo</div>
                    <div className="bg-muted p-2 rounded text-sm font-mono">[hora]</div>
                    <div className="text-sm">Hora actual</div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Ejemplos de mensajes efectivos</h3>
                  
                  <div className="border p-4 rounded-md mb-3">
                    <p className="font-medium mb-1">Recordatorio de cita</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Estimado/a [nombre_paciente],
                      <br /><br />
                      Le recuerdo que tiene una cita programada para el [fecha_cita] a las [hora_cita]. 
                      <br /><br />
                      Por favor, confirme su asistencia respondiendo a este mensaje. En caso de no poder asistir, le agradecería que me lo comunique con al menos 24 horas de anticipación.
                      <br /><br />
                      Saludos cordiales,
                      <br />
                      [nombre_doctor]
                    </p>
                  </div>
                  
                  <div className="border p-4 rounded-md">
                    <p className="font-medium mb-1">Mensaje post-sesión</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Estimado/a [nombre_paciente],
                      <br /><br />
                      Quería agradecerle por nuestra sesión de hoy. Hemos avanzado en aspectos importantes y me gustaría recordarle practicar los ejercicios que discutimos.
                      <br /><br />
                      Si tiene cualquier duda o inquietud antes de nuestra próxima sesión, no dude en contactarme.
                      <br /><br />
                      Atentamente,
                      <br />
                      [nombre_doctor]
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={() => setIsCreatingTemplate(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear nueva plantilla
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Messages;
