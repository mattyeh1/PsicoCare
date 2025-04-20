import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
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
import { Loader2, MessageSquare, Send } from "lucide-react";
import MessageList from "./MessageList";
import ComposeMessage from "./ComposeMessage";

interface PatientMessageCenterProps {
  psychologist?: User | null;
}

const PatientMessageCenter = ({ psychologist }: PatientMessageCenterProps) => {
  const { user } = useAuth();
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  
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

  // Count unread messages
  const unreadCount = receivedMessages?.filter(msg => !msg.read_at).length || 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Mensajes</CardTitle>
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
                messages={receivedMessages || []}
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