import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import { Message, User } from "@shared/schema";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, MessageSquare, Send, Wifi, WifiOff } from "lucide-react";
import MessageList from "./MessageList";
import ComposeMessage from "./ComposeMessage";

interface PatientMessageCenterProps {
  psychologist?: User | null;
}

const PatientMessageCenter = ({ psychologist }: PatientMessageCenterProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [wsConnectionStatus, setWsConnectionStatus] = useState('');
  
  // Configure WebSocket connection
  // Solo activar WebSocket si el usuario está autenticado
  const { 
    status: webSocketStatus, 
    sendMessage,
    isConnected: wsConnected
  } = useWebSocket(!!user ? '/ws' : null, {
    onOpen: () => {
      // Send authentication message when connection is established
      if (user && user.id) {
        console.log(`[WebSocket] Autenticando como usuario ID ${user.id}`);
        const authMsg = {
          type: 'auth',
          userId: user.id,
          userType: user.user_type
        };
        sendMessage(authMsg);
        setWsConnectionStatus('connected');
      } else {
        console.log('[WebSocket] Usuario no autenticado, no se puede enviar la autenticación');
      }
    },
    onMessage: (data) => {
      console.log('[WebSocket] Received message:', data);
      
      // Handle WebSocket message notifications
      if (data.type === 'new_message') {
        // Solo actualizar listas y mostrar notificaciones para mensajes de otros
        if (data.message && data.message.recipient_id === user?.id && data.message.sender_id !== user?.id) {
          // Actualizar la lista de mensajes recibidos
          queryClient.invalidateQueries({ queryKey: ['/api/messages/received'] });
          
          // Mostrar notificación solo para mensajes de otros usuarios
          toast({
            title: 'Nuevo mensaje',
            description: `Has recibido un nuevo mensaje: ${data.message.subject || 'Sin asunto'}`,
            duration: 5000,
          });
        }
      } 
      // Handle message sent confirmations
      else if (data.type === 'message_sent') {
        // Si recibo confirmación de un mensaje que envié, actualizar mis listas
        if (data.message && data.message.sender_id === user?.id) {
          // Actualizar mensajes enviados sin notificación
          queryClient.invalidateQueries({ queryKey: ['/api/messages/sent'] });
          
          // Confirmar con toast discreta que el mensaje fue enviado
          toast({
            title: 'Mensaje enviado',
            description: `Tu mensaje "${data.message.subject || 'Sin asunto'}" ha sido enviado.`,
            duration: 3000,
          });
        }
      }
    },
    onClose: () => {
      setWsConnectionStatus('disconnected');
    },
    onError: () => {
      setWsConnectionStatus('error');
    }
  });

  // Send auth message when user changes
  useEffect(() => {
    if (wsConnected && user) {
      const authMsg = {
        type: 'auth',
        userId: user.id,
        userType: user.user_type
      };
      sendMessage(authMsg);
    }
  }, [wsConnected, user, sendMessage]);
  
  // Fetch received messages
  const { 
    data: receivedMessages, 
    isLoading: receivedMessagesLoading 
  } = useQuery<Message[]>({
    queryKey: ["/api/messages/received"],
    enabled: !!user && user.user_type === 'patient',
    retry: false,
    refetchOnWindowFocus: true
  });
  
  // Fetch sent messages
  const { 
    data: sentMessages, 
    isLoading: sentMessagesLoading 
  } = useQuery<Message[]>({
    queryKey: ["/api/messages/sent"],
    enabled: !!user && user.user_type === 'patient',
    retry: false,
    refetchOnWindowFocus: true
  });

  // Count unread messages (solo los que son para mí)
  const unreadCount = receivedMessages?.filter(msg => !msg.read_at && msg.recipient_id === user?.id).length || 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center">
              <CardTitle className="text-xl">Mensajes</CardTitle>
              {wsConnected ? (
                <div className="ml-2 flex items-center">
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="ml-1 text-xs text-green-500">Conectado</span>
                </div>
              ) : (
                <div className="ml-2 flex items-center">
                  <WifiOff className="h-4 w-4 text-gray-400" />
                  <span className="ml-1 text-xs text-gray-400">Desconectado</span>
                </div>
              )}
            </div>
            <CardDescription>
              Comunicación con tu psicólogo
            </CardDescription>
          </div>
          <Button onClick={() => setIsComposeOpen(true)}>
            <Send className="h-4 w-4 mr-2" />
            Nuevo mensaje
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="received" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="received" className="relative">
              Recibidos
              {unreadCount > 0 && (
                <span className="absolute top-0 right-1 translate-x-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[0.625rem] font-medium text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent">Enviados</TabsTrigger>
          </TabsList>
          
          <TabsContent value="received" className="mt-4">
            {receivedMessagesLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <MessageList 
                messages={(receivedMessages || []).filter(msg => msg.recipient_id === user?.id)}
                currentUser={user}
                emptyMessage="No has recibido ningún mensaje todavía."
              />
            )}
          </TabsContent>
          
          <TabsContent value="sent" className="mt-4">
            {sentMessagesLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <MessageList 
                messages={sentMessages || []}
                currentUser={user}
                emptyMessage="No has enviado ningún mensaje todavía."
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Compose Message Dialog */}
      <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Nuevo mensaje</DialogTitle>
          </DialogHeader>
          {psychologist ? (
            <ComposeMessage
              currentUser={user}
              recipientId={psychologist.id}
              recipientName={psychologist.full_name}
              onSuccess={() => setIsComposeOpen(false)}
              onCancel={() => setIsComposeOpen(false)}
            />
          ) : (
            <div className="py-4 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2">No se encontró información de tu psicólogo.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PatientMessageCenter;