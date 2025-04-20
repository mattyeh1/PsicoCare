import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  MessageSquare, 
  ChevronRight, 
  MailOpen, 
  MailX, 
  Clock,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Message, User } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MessageListProps {
  messages: Message[];
  currentUser: User | null;
  isLoading?: boolean;
  emptyMessage?: string;
  hideActions?: boolean;
}

const MessageList = ({
  messages,
  currentUser,
  isLoading = false,
  emptyMessage = "No hay mensajes para mostrar",
  hideActions = false
}: MessageListProps) => {
  const { toast } = useToast();
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showMessageDetail, setShowMessageDetail] = useState(false);

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
      setShowMessageDetail(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el mensaje.",
        variant: "destructive",
      });
    },
  });

  // Helper to get user name from message
  const getUserName = (userId: number) => {
    // If current user id matches the userId, it's "Tú"
    if (currentUser?.id === userId) {
      return "Tú";
    }
    // Otherwise return the name if we can find it, or "Usuario"
    return currentUser?.full_name || "Usuario";
  };

  // Handle viewing a message detail
  const handleViewMessage = (message: Message) => {
    setSelectedMessage(message);
    setShowMessageDetail(true);
    
    // Si el mensaje es para mí y no ha sido leído, marcarlo como leído
    if (!message.read_at && currentUser?.id === message.recipient_id) {
      console.log(`Marcando mensaje #${message.id} como leído (destinatario: ${message.recipient_id})`);
      markAsReadMutation.mutate(message.id);
    }
  };

  // Format date in a human-readable way
  const formatMessageDate = (date: Date | string) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (messageDate.toDateString() === today.toDateString()) {
      return `Hoy, ${format(messageDate, 'HH:mm')}`;
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return `Ayer, ${format(messageDate, 'HH:mm')}`;
    } else {
      return format(messageDate, 'dd MMM yyyy, HH:mm', { locale: es });
    }
  };

  // If there are no messages, display an empty state
  if (messages.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 pb-6 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-2 text-lg font-medium text-foreground">
            {emptyMessage}
          </h3>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <Card key={message.id} className="cursor-pointer hover:bg-primary/5">
          <CardHeader 
            className="p-4 pb-2 flex flex-row items-start justify-between" 
            onClick={() => handleViewMessage(message)}
          >
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">
                  {message.subject}
                </CardTitle>
                {!message.read_at && currentUser?.id === message.recipient_id && (
                  <Badge variant="default" className="ml-2">
                    Nuevo
                  </Badge>
                )}
              </div>
              <CardDescription className="flex items-center mt-1">
                <span className="mr-2">
                  {currentUser?.id === message.sender_id 
                    ? `Para: ${getUserName(message.recipient_id)}` 
                    : `De: ${getUserName(message.sender_id)}`}
                </span>
                <span className="flex items-center text-xs">
                  <Clock className="h-3 w-3 mr-1 inline" />
                  {formatMessageDate(message.sent_at)}
                </span>
              </CardDescription>
            </div>
            <div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent 
            className="p-4 pt-0" 
            onClick={() => handleViewMessage(message)}
          >
            <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-line">
              {message.content}
            </p>
          </CardContent>
        </Card>
      ))}

      {/* Dialog for message detail */}
      <Dialog open={showMessageDetail} onOpenChange={setShowMessageDetail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedMessage?.subject}</DialogTitle>
            <DialogDescription className="flex items-center justify-between">
              <span>
                {currentUser?.id === selectedMessage?.sender_id
                  ? `Para: ${getUserName(selectedMessage?.recipient_id || 0)}`
                  : `De: ${getUserName(selectedMessage?.sender_id || 0)}`}
              </span>
              <span className="text-xs">
                {selectedMessage && formatMessageDate(selectedMessage.sent_at)}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 whitespace-pre-line">
            {selectedMessage?.content}
          </div>

          <DialogFooter className="mt-4">
            {!hideActions && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMessageMutation.mutate(selectedMessage?.id || 0)}
                disabled={deleteMessageMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {deleteMessageMutation.isPending ? "Eliminando..." : "Eliminar"}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setShowMessageDetail(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MessageList;