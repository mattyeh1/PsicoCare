import { useState, useEffect } from "react";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Calendar, Download, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CalendarExportMenuProps {
  appointmentId: number;
  buttonStyle?: "icon" | "text" | "full";
  iconSize?: number;
}

const CalendarExportMenu = ({ 
  appointmentId, 
  buttonStyle = "icon", 
  iconSize = 18 
}: CalendarExportMenuProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  // Consultar los URLs para exportar la cita
  const { data: calendarUrls, isLoading, error } = useQuery<{
    ical: string;
    google: string;
    outlook: string;
    yahoo: string;
  }>({
    queryKey: [`/api/appointments/${appointmentId}/calendar-links`],
    enabled: isOpen, // Solo cargar cuando se abre el menú
    retry: 1,
  });
  
  // Manejar errores
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las opciones para exportar la cita.",
        variant: "destructive"
      });
      setIsOpen(false);
    }
  }, [error, toast]);

  // Función para descargar el archivo ICS
  const downloadIcs = () => {
    if (!calendarUrls?.ical) return;
    
    // Crear un elemento temporal <a> para descargar el archivo
    window.location.href = calendarUrls.ical;
    setIsOpen(false);
  };

  // Función para abrir calendario externo
  const openExternalCalendar = (url: string) => {
    window.open(url, "_blank");
    setIsOpen(false);
  };

  // Renderizar botón según el estilo solicitado
  const renderButton = () => {
    switch (buttonStyle) {
      case "icon":
        return (
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
            <Calendar size={iconSize} />
          </Button>
        );
      case "text":
        return (
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(true)}>
            <Calendar className="mr-2" size={16} />
            Agregar al calendario
          </Button>
        );
      case "full":
        return (
          <Button variant="outline" onClick={() => setIsOpen(true)}>
            <Calendar className="mr-2" size={16} />
            Agregar al calendario
          </Button>
        );
      default:
        return (
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
            <Calendar size={iconSize} />
          </Button>
        );
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        {renderButton()}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm font-medium">
          Añadir a calendario
        </div>
        <DropdownMenuSeparator />
        {isLoading ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            Cargando opciones...
          </div>
        ) : (
          <>
            <DropdownMenuItem 
              onClick={downloadIcs}
              disabled={!calendarUrls?.ical}
              className="flex items-center cursor-pointer"
            >
              <Download className="mr-2" size={16} />
              <span>Descargar archivo .ics</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => openExternalCalendar(calendarUrls?.google || "")}
              disabled={!calendarUrls?.google}
              className="flex items-center cursor-pointer"
            >
              <ExternalLink className="mr-2" size={16} />
              <span>Google Calendar</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => openExternalCalendar(calendarUrls?.outlook || "")}
              disabled={!calendarUrls?.outlook}
              className="flex items-center cursor-pointer"
            >
              <ExternalLink className="mr-2" size={16} />
              <span>Outlook Calendar</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => openExternalCalendar(calendarUrls?.yahoo || "")}
              disabled={!calendarUrls?.yahoo}
              className="flex items-center cursor-pointer"
            >
              <ExternalLink className="mr-2" size={16} />
              <span>Yahoo Calendar</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CalendarExportMenu;