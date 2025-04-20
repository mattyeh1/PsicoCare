import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send } from "lucide-react";
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
import { User } from "@shared/schema";

// Form schema for sending messages
const messageFormSchema = z.object({
  subject: z.string().min(3, {
    message: "El asunto debe tener al menos 3 caracteres.",
  }),
  message: z.string().min(10, {
    message: "El mensaje debe tener al menos 10 caracteres.",
  }),
});

interface ComposeMessageProps {
  currentUser: User | null;
  recipientId: number;
  recipientName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ComposeMessage = ({
  currentUser,
  recipientId,
  recipientName,
  onSuccess,
  onCancel
}: ComposeMessageProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Message form
  const messageForm = useForm<z.infer<typeof messageFormSchema>>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: {
      subject: "",
      message: ""
    },
  });

  // Submit message form to send a message
  const onSubmitMessage = async (values: z.infer<typeof messageFormSchema>) => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para enviar mensajes.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Prepare the message data
      const messageData = {
        sender_id: currentUser.id,  // Añadir el ID del remitente
        recipient_id: recipientId,
        content: processMessage(values.message),
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
        description: `Tu mensaje ha sido enviado exitosamente a ${recipientName}.`,
      });
      
      // Reset form and call success callback
      messageForm.reset();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
      let errorMsg = "No se pudo enviar el mensaje. Inténtalo de nuevo.";
      
      // Intentar extraer un mensaje de error más específico
      if (error instanceof Error) {
        if (error.message.includes("Validation error")) {
          errorMsg = `Error de validación: ${error.message}`;
        } else {
          errorMsg = `Error: ${error.message}`;
        }
      } 
      
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Replace placeholders in the message content
  const processMessage = (content: string) => {
    let processedContent = content;
    
    if (currentUser) {
      processedContent = processedContent.replace(/\[nombre_paciente\]/g, currentUser.full_name);
    }
    
    // Replace psychologist name if available
    processedContent = processedContent.replace(/\[nombre_doctor\]/g, recipientName);
    
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
    <Form {...messageForm}>
      <form onSubmit={messageForm.handleSubmit(onSubmitMessage)} className="space-y-4">
        <FormField
          control={messageForm.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Asunto</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Escribe el asunto del mensaje"
                  {...field}
                  disabled={isLoading}
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
                  placeholder={`Escribe tu mensaje para ${recipientName}...`}
                  className="min-h-[150px]"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancelar
            </Button>
          )}
          <Button 
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {isLoading ? "Enviando..." : "Enviar mensaje"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ComposeMessage;