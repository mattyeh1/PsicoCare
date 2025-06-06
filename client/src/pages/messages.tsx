import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { 
  generateMessage, 
  improveMessage, 
  suggestTitle,
  type MessageGenerationParams 
} from "@/services/ai-service";
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
import { 
  Plus, 
  Pencil, 
  Copy, 
  MessageSquare, 
  Wand2, 
  Sparkles, 
  RocketIcon, 
  Send, 
  MailOpen, 
  MailX,
  Inbox, 
  CheckCircle,
  Clock
} from "lucide-react";
import { MessageTemplate, Patient, Message, User } from "@shared/schema";
import MessageTemplates from "@/components/messaging/MessageTemplates";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
  const [isGeneratingWithAI, setIsGeneratingWithAI] = useState(false);
  const [isSuggestingTitle, setIsSuggestingTitle] = useState(false);
  const [isImprovingMessage, setIsImprovingMessage] = useState(false);

  // Consultar datos del usuario para estar seguros que hay sesión - método más simple y directo
  const { 
    data: userCheck, 
    refetch: refetchUserCheck,
    isLoading: isUserCheckLoading
  } = useQuery<User>({
    queryKey: ["/api/user?check=true"],
    retry: 3, // Permitir reintentos automáticos
    retryDelay: 1000, // Esperar un segundo entre reintentos
    refetchOnMount: true, 
    staleTime: 0
  });

  // Verificar autenticación y redirigir si es necesario - versión simplificada
  useEffect(() => {
    // Solo ejecutar cuando termine de cargar
    if (isLoading || isUserCheckLoading) return;
    
    // Log de estado
    console.log('[Messages Page] Estado de autenticación:', { 
      userAuth: !!user, 
      userCheck: !!userCheck,
      cookiePresent: document.cookie.includes('connect.sid')
    });
    
    // Si no hay sesión, redirigir después de verificar
    if (!user && !userCheck) {
      console.warn("[Messages Page] No se detectó sesión. Redirigiendo a login.");
      
      // Construir URL con parámetro de redirección de retorno
      const returnUrl = encodeURIComponent(window.location.pathname);
      const loginUrl = `/login?returnTo=${returnUrl}`;
      
      // Mostrar mensaje de error
      toast({
        title: "Sesión expirada o no iniciada",
        description: "Se requiere iniciar sesión para acceder a esta sección.",
        variant: "destructive",
        action: (
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => window.location.href = loginUrl}
          >
            Iniciar sesión
          </Button>
        ),
        duration: 5000,
      });
      
      // Redirigir automáticamente
      const redirectTimer = setTimeout(() => {
        console.log("[Messages Page] Redirigiendo a:", loginUrl);
        window.location.href = loginUrl;
      }, 2000);
      
      return () => clearTimeout(redirectTimer);
    } else if (user || userCheck) {
      // Usuario autenticado correctamente
      const userName = (user?.username || userCheck?.username || "Usuario");
      console.log(`[Messages Page] Usuario autenticado: ${userName}`);
    }
  }, [user, userCheck, toast, isLoading, isUserCheckLoading]);

  // Fetch message templates with authentication handling
  const { data: templates, isLoading: templatesLoading } = useQuery<MessageTemplate[]>({
    queryKey: ["/api/message-templates"],
    // No sobrescribir el queryFn por defecto
    enabled: !!user, // Solo ejecutar si el usuario está autenticado
    retry: false,
    refetchOnWindowFocus: true
  });

  // Fetch patients with authentication handling
  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
    // No sobrescribir el queryFn por defecto
    enabled: !!user, // Solo ejecutar si el usuario está autenticado
    retry: false,
    refetchOnWindowFocus: true
  });
  
  // Fetch received messages
  const { data: receivedMessages, isLoading: receivedMessagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages/received"],
    enabled: !!user,
    retry: false,
    refetchOnWindowFocus: true
  });
  
  // Fetch sent messages
  const { data: sentMessages, isLoading: sentMessagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages/sent"],
    enabled: !!user,
    retry: false,
    refetchOnWindowFocus: true
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

  // Generar una plantilla de mensaje con IA
  const handleGenerateWithAI = async () => {
    try {
      setIsGeneratingWithAI(true);
      const messageType = templateForm.getValues("type");
      
      if (!messageType) {
        toast({
          title: "Error",
          description: "Por favor selecciona primero un tipo de mensaje",
          variant: "destructive",
        });
        setIsGeneratingWithAI(false);
        return;
      }
      
      // Traducir el tipo de mensaje para el prompt
      const messageTypeMap: Record<string, string> = {
        appointment_reminder: "recordatorio de cita",
        follow_up: "seguimiento de terapia",
        welcome: "bienvenida a nuevos pacientes",
        cancellation: "cancelación de cita",
        rescheduling: "reprogramación de cita",
        custom: "personalizado"
      };
      
      const params: MessageGenerationParams = {
        recipientName: "[nombre_paciente]",
        messageType: messageTypeMap[messageType] || messageType,
        psychologistName: user?.full_name || "[nombre_doctor]",
        customInstructions: "Incluye marcadores como [nombre_paciente], [nombre_doctor], [fecha_cita], [hora_cita] donde sea apropiado."
      };
      
      const content = await generateMessage(params);
      templateForm.setValue("content", content);
      
      // Una vez que tenemos el contenido, podemos sugerir un título
      if (!templateForm.getValues("title")) {
        handleSuggestTitle(content);
      }
      
      toast({
        title: "¡Generado con éxito!",
        description: "Contenido generado con IA. Puedes editarlo según tus necesidades.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo generar el contenido. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingWithAI(false);
    }
  };
  
  // Sugerir título para una plantilla basado en su contenido
  const handleSuggestTitle = async (content?: string) => {
    try {
      setIsSuggestingTitle(true);
      const contentToUse = content || templateForm.getValues("content");
      
      if (!contentToUse || contentToUse.length < 10) {
        toast({
          title: "Error",
          description: "El contenido es demasiado corto para sugerir un título",
          variant: "destructive",
        });
        setIsSuggestingTitle(false);
        return;
      }
      
      const title = await suggestTitle(contentToUse);
      templateForm.setValue("title", title);
      
      toast({
        title: "Título sugerido",
        description: "Se ha generado un título basado en el contenido.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo generar un título. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSuggestingTitle(false);
    }
  };
  
  // Mejorar un mensaje existente
  const handleImproveMessage = async () => {
    try {
      setIsImprovingMessage(true);
      const message = messageForm.getValues("message");
      
      if (!message || message.length < 10) {
        toast({
          title: "Error",
          description: "El mensaje es demasiado corto para mejorar",
          variant: "destructive",
        });
        setIsImprovingMessage(false);
        return;
      }
      
      const instructions = "Mejora este mensaje para que sea más profesional, empático y claro. Mantén los marcadores existentes.";
      const improvedMessage = await improveMessage(message, instructions);
      messageForm.setValue("message", improvedMessage);
      
      toast({
        title: "Mensaje mejorado",
        description: "Su mensaje ha sido mejorado con IA.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo mejorar el mensaje. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsImprovingMessage(false);
    }
  };

  // Submit template form
  const onSubmitTemplate = async (values: z.infer<typeof templateFormSchema>) => {
    const templateData = {
      ...values,
      psychologist_id: user?.id,
    };
    
    createTemplateMutation.mutate(templateData);
  };

  // Submit message form to send a message to a patient
  const onSubmitMessage = async (values: z.infer<typeof messageFormSchema>) => {
    setIsLoading(true);
    
    try {
      // Prepare the message data
      const messageData = {
        recipient_id: parseInt(values.patient_id),
        content: processMessage(values.message, values.patient_id),
        subject: values.subject,
        sent_at: new Date(),
        is_system_message: false,
        related_appointment_id: null,
        parent_message_id: null
      };
      
      // Send the message using the API
      await apiRequest("POST", "/api/messages", messageData);
      
      toast({
        title: "Mensaje enviado",
        description: "Tu mensaje ha sido enviado exitosamente al paciente.",
      });
      
      setIsComposing(false);
      messageForm.reset();
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
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

  // Mark message as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest("PATCH", `/api/messages/${messageId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/received"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo marcar el mensaje como leído.",
        variant: "destructive",
      });
    },
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest("DELETE", `/api/messages/${messageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/received"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/sent"] });
      toast({
        title: "Mensaje eliminado",
        description: "El mensaje ha sido eliminado exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el mensaje.",
        variant: "destructive",
      });
    },
  });

  // Format date for display
  const formatDate = (date: Date | string | null) => {
    if (!date) return "Fecha desconocida";
    try {
      return format(new Date(date), "d 'de' MMMM, yyyy - HH:mm", { locale: es });
    } catch (e) {
      return "Fecha inválida";
    }
  };

  // Handle mark as read
  const handleMarkAsRead = (messageId: number) => {
    markAsReadMutation.mutate(messageId);
  };

  // Handle delete message
  const handleDeleteMessage = (messageId: number) => {
    if (confirm("¿Estás seguro de que deseas eliminar este mensaje?")) {
      deleteMessageMutation.mutate(messageId);
    }
  };

  // Get user data for display
  const getUserName = (userId: number) => {
    if (user && userId === user.id) return `Tú (${user.full_name})`;
    if (patients) {
      const patient = patients.find(p => p.id === userId);
      if (patient) return patient.name;
    }
    return `Usuario #${userId}`;
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
        
        {/* Mensajes Tab */}
        <Tabs defaultValue="received" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="received">
              <Inbox className="h-4 w-4 mr-2" />
              Mensajes recibidos
              {receivedMessages?.filter(m => !m.read_at).length > 0 && (
                <Badge className="ml-2" variant="destructive">
                  {receivedMessages.filter(m => !m.read_at).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent">
              <Send className="h-4 w-4 mr-2" />
              Mensajes enviados
            </TabsTrigger>
          </TabsList>
          
          {/* Mensajes recibidos */}
          <TabsContent value="received">
            {receivedMessagesLoading ? (
              <div className="flex justify-center items-center h-40">
                <p>Cargando mensajes...</p>
              </div>
            ) : receivedMessages?.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-40">
                  <MailOpen className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No tienes mensajes recibidos</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {receivedMessages?.map((message) => (
                  <Card key={message.id} className={message.read_at ? "" : "border-primary"}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center">
                            {!message.read_at && (
                              <Badge variant="secondary" className="mr-2">Nuevo</Badge>
                            )}
                            {message.subject}
                          </CardTitle>
                          <CardDescription>
                            De: {getUserName(message.sender_id)} | {formatDate(message.sent_at)}
                          </CardDescription>
                        </div>
                        <div className="flex gap-1">
                          {!message.read_at && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleMarkAsRead(message.id)}
                              title="Marcar como leído"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteMessage(message.id)}
                            title="Eliminar mensaje"
                          >
                            <MailX className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </CardContent>
                    <CardFooter className="flex justify-between pt-0">
                      {message.read_at ? (
                        <p className="text-xs text-muted-foreground flex items-center">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Leído el {formatDate(message.read_at)}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          No leído
                        </p>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          {/* Mensajes enviados */}
          <TabsContent value="sent">
            {sentMessagesLoading ? (
              <div className="flex justify-center items-center h-40">
                <p>Cargando mensajes...</p>
              </div>
            ) : sentMessages?.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-40">
                  <Send className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No has enviado ningún mensaje aún</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {sentMessages?.map((message) => (
                  <Card key={message.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{message.subject}</CardTitle>
                          <CardDescription>
                            Para: {getUserName(message.recipient_id)} | {formatDate(message.sent_at)}
                          </CardDescription>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteMessage(message.id)}
                          title="Eliminar mensaje"
                        >
                          <MailX className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </CardContent>
                    <CardFooter className="flex justify-between pt-0">
                      {message.read_at ? (
                        <p className="text-xs text-muted-foreground flex items-center">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Leído el {formatDate(message.read_at)}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          No leído
                        </p>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

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
                      <div className="flex justify-between items-center">
                        <FormLabel>Contenido</FormLabel>
                        <div className="flex gap-2">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleSuggestTitle()}
                            disabled={isSuggestingTitle}
                          >
                            <Sparkles className="h-4 w-4 mr-1" />
                            {isSuggestingTitle ? "Generando..." : "Sugerir título"}
                          </Button>
                          
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={handleGenerateWithAI}
                            disabled={isGeneratingWithAI}
                          >
                            <Wand2 className="h-4 w-4 mr-1" />
                            {isGeneratingWithAI ? "Generando..." : "Generar con IA"}
                          </Button>
                        </div>
                      </div>
                      <FormControl>
                        <Textarea 
                          placeholder="Escribe el contenido de tu plantilla. Puedes usar [nombre_paciente], [nombre_doctor], [fecha_cita], [hora_cita] como marcadores o generar contenido automáticamente con IA."
                          className="min-h-40 font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">
                        Usa la IA para generar contenido profesional y empático automáticamente.
                      </p>
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
                      <div className="flex justify-between items-center">
                        <FormLabel>Mensaje</FormLabel>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={handleImproveMessage}
                          disabled={isImprovingMessage || !field.value || field.value.length < 10}
                        >
                          <Sparkles className="h-4 w-4 mr-1" />
                          {isImprovingMessage ? "Mejorando..." : "Mejorar mensaje con IA"}
                        </Button>
                      </div>
                      <FormControl>
                        <Textarea 
                          placeholder="Escribe tu mensaje o selecciona una plantilla"
                          className="min-h-40"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">
                        Usa el botón "Mejorar mensaje con IA" para perfeccionar automáticamente el tono y la claridad.
                      </p>
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
