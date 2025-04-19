import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, MessageSquare, Mail, CheckSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MessageTemplate } from "@shared/schema";

interface MessageTemplatesProps {
  templates: MessageTemplate[];
  onSelectTemplate: (template: MessageTemplate) => void;
  onComposeMessage: () => void;
}

const MessageTemplates = ({
  templates,
  onSelectTemplate,
  onComposeMessage,
}: MessageTemplatesProps) => {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Human readable message types
  const messageTypeNames: { [key: string]: string } = {
    appointment_reminder: "Recordatorio de cita",
    follow_up: "Seguimiento",
    welcome: "Bienvenida",
    cancellation: "Cancelación",
    rescheduling: "Reprogramación",
    custom: "Personalizado",
  };

  // Group templates by type
  const groupedTemplates = templates.reduce((acc, template) => {
    const type = template.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(template);
    return acc;
  }, {} as Record<string, MessageTemplate[]>);

  // Copy template content to clipboard
  const copyToClipboard = (template: MessageTemplate) => {
    navigator.clipboard.writeText(template.content);
    setCopiedId(template.id);
    
    toast({
      title: "Contenido copiado",
      description: "El contenido de la plantilla ha sido copiado al portapapeles.",
    });
    
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 pb-6 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-2 text-lg font-medium text-foreground">
            No hay plantillas de mensajes
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea tu primera plantilla de mensaje haciendo clic en "Nueva plantilla".
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedTemplates).map(([type, typeTemplates]) => (
        <div key={type}>
          <h3 className="text-lg font-medium mb-3">{messageTypeNames[type] || "Otros"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {typeTemplates.map((template) => (
              <Card key={template.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{template.title}</CardTitle>
                  <CardDescription>
                    {messageTypeNames[template.type] || "Personalizado"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-line">
                    {template.content}
                  </p>
                </CardContent>
                <CardFooter className="pt-2 flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(template)}
                  >
                    {copiedId === template.id ? (
                      <CheckSquare className="h-4 w-4 mr-1" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    {copiedId === template.id ? "Copiado" : "Copiar"}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      onSelectTemplate(template);
                      onComposeMessage();
                    }}
                  >
                    <Mail className="h-4 w-4 mr-1" />
                    Usar
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageTemplates;
