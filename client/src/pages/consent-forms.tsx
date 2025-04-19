import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
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
import { Plus, FileText, Clock, Download, Eye } from "lucide-react";
import { ConsentForm as ConsentFormType, Patient, PatientConsent } from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import ConsentForm from "@/components/forms/ConsentForm";

// Form schema for consent forms
const consentFormSchema = z.object({
  title: z.string().min(3, {
    message: "El título debe tener al menos 3 caracteres.",
  }),
  content: z.string().min(50, {
    message: "El contenido debe tener al menos 50 caracteres.",
  }),
});

// Form schema for signing consent forms
const signConsentSchema = z.object({
  patient_id: z.string().min(1, {
    message: "Por favor selecciona un paciente.",
  }),
  consent_form_id: z.string().min(1, {
    message: "Por favor selecciona un formulario de consentimiento.",
  }),
  signature: z.string().min(3, {
    message: "Por favor ingresa tu firma.",
  }),
});

const ConsentForms = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [selectedForm, setSelectedForm] = useState<ConsentFormType | null>(null);
  const [viewingConsent, setViewingConsent] = useState<PatientConsent | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch consent forms
  const { data: consentForms, isLoading: formsLoading } = useQuery<ConsentFormType[]>({
    queryKey: ["/api/consent-forms"],
  });

  // Fetch patients
  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  // Fetch patient consents
  const { data: patientConsents, isLoading: consentsLoading } = useQuery<PatientConsent[]>({
    queryKey: ["/api/patient-consents"],
  });

  // Create consent form form
  const form = useForm<z.infer<typeof consentFormSchema>>({
    resolver: zodResolver(consentFormSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });

  // Sign consent form
  const signForm = useForm<z.infer<typeof signConsentSchema>>({
    resolver: zodResolver(signConsentSchema),
    defaultValues: {
      patient_id: "",
      consent_form_id: "",
      signature: "",
    },
  });

  // Create consent form mutation
  const createConsentFormMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/consent-forms", data);
    },
    onSuccess: () => {
      toast({
        title: "Formulario creado",
        description: "El formulario de consentimiento ha sido creado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/consent-forms"] });
      setIsCreating(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el formulario. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  // Sign consent form mutation
  const signConsentMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/patient-consents", data);
    },
    onSuccess: () => {
      toast({
        title: "Consentimiento firmado",
        description: "El formulario de consentimiento ha sido firmado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/patient-consents"] });
      setIsSigning(false);
      signForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo firmar el consentimiento. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  // Submit consent form
  const onSubmit = async (values: z.infer<typeof consentFormSchema>) => {
    const consentFormData = {
      ...values,
      psychologist_id: user?.id,
    };
    
    createConsentFormMutation.mutate(consentFormData);
  };

  // Submit sign form
  const onSubmitSign = async (values: z.infer<typeof signConsentSchema>) => {
    const signData = {
      patient_id: parseInt(values.patient_id),
      consent_form_id: parseInt(values.consent_form_id),
      signed_at: new Date().toISOString(),
      signature: values.signature,
    };
    
    signConsentMutation.mutate(signData);
  };

  // Get patient name by id
  const getPatientName = (patientId: number) => {
    const patient = patients?.find(p => p.id === patientId);
    return patient ? patient.name : 'Paciente desconocido';
  };

  // Get consent form title by id
  const getConsentFormTitle = (formId: number) => {
    const form = consentForms?.find(f => f.id === formId);
    return form ? form.title : 'Formulario desconocido';
  };

  // Generate PDF (in a real app, this would generate a real PDF)
  const generatePDF = (consent: PatientConsent) => {
    toast({
      title: "PDF generado",
      description: "El PDF del consentimiento ha sido generado.",
    });
  };

  return (
    <div className="container py-8">
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Consentimientos informados</h1>
            <p className="text-muted-foreground">
              Gestiona tus formularios de consentimiento informado digitales
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsSigning(true)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Firmar consentimiento
            </Button>
            <Button
              onClick={() => setIsCreating(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo formulario
            </Button>
          </div>
        </div>

        {/* Create consent form dialog */}
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Crear formulario de consentimiento</DialogTitle>
              <DialogDescription>
                Crea un nuevo formulario de consentimiento informado para tus pacientes
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ej: Consentimiento para terapia online"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contenido</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Escribe el contenido del formulario de consentimiento..."
                          className="min-h-48"
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
                    onClick={() => setIsCreating(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createConsentFormMutation.isPending}>
                    {createConsentFormMutation.isPending ? "Creando..." : "Crear formulario"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Sign consent form dialog */}
        <Dialog open={isSigning} onOpenChange={setIsSigning}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Firmar consentimiento informado</DialogTitle>
              <DialogDescription>
                Completa este formulario para registrar el consentimiento de un paciente
              </DialogDescription>
            </DialogHeader>
            <Form {...signForm}>
              <form onSubmit={signForm.handleSubmit(onSubmitSign)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={signForm.control}
                    name="patient_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Paciente</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
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
                    control={signForm.control}
                    name="consent_form_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Formulario</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            const selectedForm = consentForms?.find(f => f.id === parseInt(value));
                            if (selectedForm) {
                              setSelectedForm(selectedForm);
                            }
                          }} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un formulario" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {consentForms?.map((form) => (
                              <SelectItem key={form.id} value={form.id.toString()}>
                                {form.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {selectedForm && (
                  <div className="border p-4 rounded-md bg-muted/30">
                    <h3 className="font-medium mb-2">{selectedForm.title}</h3>
                    <div className="text-sm whitespace-pre-line mb-4">
                      {selectedForm.content}
                    </div>
                  </div>
                )}
                
                <FormField
                  control={signForm.control}
                  name="signature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Firma del paciente</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Nombre completo como firma"
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
                    onClick={() => setIsSigning(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={signConsentMutation.isPending}>
                    {signConsentMutation.isPending ? "Firmando..." : "Firmar consentimiento"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* View signed consent dialog */}
        <Dialog open={!!viewingConsent} onOpenChange={() => setViewingConsent(null)}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Consentimiento firmado</DialogTitle>
              <DialogDescription>
                Detalles del consentimiento firmado por el paciente
              </DialogDescription>
            </DialogHeader>
            {viewingConsent && (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{getConsentFormTitle(viewingConsent.consent_form_id)}</h3>
                    <p className="text-sm text-muted-foreground">
                      Firmado por: {getPatientName(viewingConsent.patient_id)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Fecha: {format(new Date(viewingConsent.signed_at), "PPP", { locale: es })}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => generatePDF(viewingConsent)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Descargar PDF
                  </Button>
                </div>
                
                <div className="border p-4 rounded-md bg-muted/30">
                  {consentForms && (
                    <div className="text-sm whitespace-pre-line mb-4">
                      {consentForms.find(f => f.id === viewingConsent.consent_form_id)?.content}
                    </div>
                  )}
                  
                  <div className="border-t pt-4 mt-4">
                    <p className="text-sm font-medium">Firma: {viewingConsent.signature}</p>
                    <p className="text-sm text-muted-foreground">
                      Firmado digitalmente el {format(new Date(viewingConsent.signed_at), "PPP 'a las' HH:mm", { locale: es })}
                    </p>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button 
                    onClick={() => setViewingConsent(null)}
                  >
                    Cerrar
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Tabs defaultValue="forms" className="space-y-4">
          <TabsList>
            <TabsTrigger value="forms">Mis formularios</TabsTrigger>
            <TabsTrigger value="signed">Consentimientos firmados</TabsTrigger>
            <TabsTrigger value="templates">Plantillas recomendadas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="forms">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {formsLoading ? (
                <div className="col-span-full text-center py-12">Cargando formularios...</div>
              ) : consentForms && consentForms.length > 0 ? (
                consentForms.map((form) => (
                  <Card key={form.id} className="flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-lg">{form.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-sm text-muted-foreground line-clamp-4">
                        {form.content}
                      </p>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedForm(form);
                          signForm.setValue("consent_form_id", form.id.toString());
                          setIsSigning(true);
                        }}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Firmar
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedForm(form);
                          form.reset({
                            title: form.title,
                            content: form.content,
                          });
                          setIsCreating(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver completo
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No hay formularios</h3>
                  <p className="mt-1 text-sm text-gray-500">Crea tu primer formulario de consentimiento haciendo clic en "Nuevo formulario".</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="signed">
            <div className="space-y-4">
              {consentsLoading ? (
                <div className="text-center py-12">Cargando consentimientos firmados...</div>
              ) : patientConsents && patientConsents.length > 0 ? (
                patientConsents.map((consent) => (
                  <Card key={consent.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">{getConsentFormTitle(consent.consent_form_id)}</h3>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <FileText className="h-4 w-4" />
                            <span>Firmado por {getPatientName(consent.patient_id)}</span>
                            <span className="mx-1">•</span>
                            <Clock className="h-4 w-4" />
                            <span>{format(new Date(consent.signed_at), "PPP", { locale: es })}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => generatePDF(consent)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Descargar
                          </Button>
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => setViewingConsent(consent)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No hay consentimientos firmados</h3>
                  <p className="mt-1 text-sm text-gray-500">Los consentimientos firmados aparecerán aquí.</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="templates">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Plantillas de consentimiento recomendadas</CardTitle>
                  <CardDescription>
                    Utiliza estas plantillas como base para crear tus propios formularios de consentimiento
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ConsentForm
                    title="Consentimiento informado para terapia"
                    content="Por medio del presente documento, doy mi consentimiento para recibir servicios de psicoterapia con el Dr./Dra. [nombre_doctor]. Entiendo que la terapia implica un compromiso de tiempo, energía y recursos financieros. Me comprometo a asistir a las sesiones programadas y avisaré con 24 horas de anticipación si necesito cancelar o reprogramar.

Comprendo que la terapia puede involucrar discutir aspectos difíciles de mi vida personal y puedo experimentar emociones incómodas como tristeza, culpa, ansiedad, enojo, frustración, soledad e impotencia. También entiendo que la terapia ha demostrado tener beneficios para las personas que la realizan, como la reducción de sentimientos angustiantes, mejores relaciones, resolución de problemas específicos y mayor autoconocimiento.

Confidencialidad: Toda información compartida en las sesiones es confidencial y no será revelada a terceros sin mi autorización escrita, excepto cuando la ley lo requiera, como en casos de:
1. Riesgo de daño a mí mismo o a otros
2. Abuso o negligencia de menores, ancianos o personas con discapacidad
3. Orden judicial que requiera la divulgación de información

Comunicación electrónica: Autorizo el uso de correo electrónico y mensajes de texto para programar citas y breves consultas, entendiendo que la privacidad no puede garantizarse completamente en estos medios.

Por la presente, reconozco que he leído y entendido este consentimiento, he tenido la oportunidad de hacer preguntas sobre el mismo, y acepto los términos establecidos."
                    onUseTemplate={() => {
                      form.reset({
                        title: "Consentimiento informado para terapia",
                        content: "Por medio del presente documento, doy mi consentimiento para recibir servicios de psicoterapia con el Dr./Dra. [nombre_doctor]. Entiendo que la terapia implica un compromiso de tiempo, energía y recursos financieros. Me comprometo a asistir a las sesiones programadas y avisaré con 24 horas de anticipación si necesito cancelar o reprogramar.\n\nComprendo que la terapia puede involucrar discutir aspectos difíciles de mi vida personal y puedo experimentar emociones incómodas como tristeza, culpa, ansiedad, enojo, frustración, soledad e impotencia. También entiendo que la terapia ha demostrado tener beneficios para las personas que la realizan, como la reducción de sentimientos angustiantes, mejores relaciones, resolución de problemas específicos y mayor autoconocimiento.\n\nConfidencialidad: Toda información compartida en las sesiones es confidencial y no será revelada a terceros sin mi autorización escrita, excepto cuando la ley lo requiera, como en casos de:\n1. Riesgo de daño a mí mismo o a otros\n2. Abuso o negligencia de menores, ancianos o personas con discapacidad\n3. Orden judicial que requiera la divulgación de información\n\nComunicación electrónica: Autorizo el uso de correo electrónico y mensajes de texto para programar citas y breves consultas, entendiendo que la privacidad no puede garantizarse completamente en estos medios.\n\nPor la presente, reconozco que he leído y entendido este consentimiento, he tenido la oportunidad de hacer preguntas sobre el mismo, y acepto los términos establecidos."
                      });
                      setIsCreating(true);
                    }}
                  />
                  
                  <ConsentForm
                    title="Consentimiento para terapia online"
                    content="Mediante este documento, otorgo mi consentimiento para recibir servicios de psicoterapia en modalidad online con el Dr./Dra. [nombre_doctor]. Comprendo que la terapia online implica la utilización de videoconferencias, llamadas telefónicas u otras tecnologías de comunicación para facilitar el proceso terapéutico a distancia.

Entiendo y acepto las siguientes consideraciones específicas de la terapia online:

1. Tecnología: Es mi responsabilidad asegurar una conexión a internet estable y contar con el equipo necesario (computadora, tablet o smartphone) para participar en las sesiones.

2. Privacidad: Me comprometo a ubicarme en un espacio privado y libre de interrupciones durante las sesiones. El profesional garantiza estar en un entorno que preserve la confidencialidad.

3. Confidencialidad: El terapeuta utilizará plataformas seguras y cifradas para las sesiones, pero reconozco que ninguna tecnología puede garantizar una confidencialidad absoluta. El terapeuta no grabará las sesiones y yo me comprometo a no grabarlas sin consentimiento explícito.

4. Plan de emergencia: En caso de crisis o emergencia donde no sea posible mantener la comunicación online, se activará el siguiente protocolo: contacto con personas de confianza previamente designadas o servicios de emergencia locales.

5. Limitaciones: Reconozco que la terapia online puede tener limitaciones en comparación con la terapia presencial, como dificultades técnicas o reducción de señales no verbales.

6. Eficacia: He sido informado/a que la investigación ha demostrado que la terapia online puede ser tan efectiva como la terapia presencial para muchas condiciones, pero puede no ser adecuada en todos los casos.

7. Honorarios y cancelaciones: Las políticas de pago y cancelación son las mismas que en la terapia presencial, según lo acordado con el profesional.

Por la presente, certifico que he leído, comprendido y acepto los términos de este consentimiento informado para terapia online."
                    onUseTemplate={() => {
                      form.reset({
                        title: "Consentimiento para terapia online",
                        content: "Mediante este documento, otorgo mi consentimiento para recibir servicios de psicoterapia en modalidad online con el Dr./Dra. [nombre_doctor]. Comprendo que la terapia online implica la utilización de videoconferencias, llamadas telefónicas u otras tecnologías de comunicación para facilitar el proceso terapéutico a distancia.\n\nEntiendo y acepto las siguientes consideraciones específicas de la terapia online:\n\n1. Tecnología: Es mi responsabilidad asegurar una conexión a internet estable y contar con el equipo necesario (computadora, tablet o smartphone) para participar en las sesiones.\n\n2. Privacidad: Me comprometo a ubicarme en un espacio privado y libre de interrupciones durante las sesiones. El profesional garantiza estar en un entorno que preserve la confidencialidad.\n\n3. Confidencialidad: El terapeuta utilizará plataformas seguras y cifradas para las sesiones, pero reconozco que ninguna tecnología puede garantizar una confidencialidad absoluta. El terapeuta no grabará las sesiones y yo me comprometo a no grabarlas sin consentimiento explícito.\n\n4. Plan de emergencia: En caso de crisis o emergencia donde no sea posible mantener la comunicación online, se activará el siguiente protocolo: contacto con personas de confianza previamente designadas o servicios de emergencia locales.\n\n5. Limitaciones: Reconozco que la terapia online puede tener limitaciones en comparación con la terapia presencial, como dificultades técnicas o reducción de señales no verbales.\n\n6. Eficacia: He sido informado/a que la investigación ha demostrado que la terapia online puede ser tan efectiva como la terapia presencial para muchas condiciones, pero puede no ser adecuada en todos los casos.\n\n7. Honorarios y cancelaciones: Las políticas de pago y cancelación son las mismas que en la terapia presencial, según lo acordado con el profesional.\n\nPor la presente, certifico que he leído, comprendido y acepto los términos de este consentimiento informado para terapia online."
                      });
                      setIsCreating(true);
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ConsentForms;
