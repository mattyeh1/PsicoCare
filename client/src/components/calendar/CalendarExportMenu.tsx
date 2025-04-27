import React, { useState, useEffect } from "react";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Calendar, Download, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  
  // Estado para rastrear si ha habido un error al cargar
  const [hasError, setHasError] = useState(false);
  
  // Manejar errores
  useEffect(() => {
    if (error) {
      console.error("Error al cargar enlaces de calendario:", error);
      setHasError(true);
      
      toast({
        title: "Error al cargar calendario",
        description: "No se pudieron cargar las opciones para exportar la cita. Intente nuevamente más tarde.",
        variant: "destructive",
        duration: 5000,
      });
      
      // No cerramos inmediatamente el menú para mostrar el estado de error
      setTimeout(() => setIsOpen(false), 2000);
    } else {
      setHasError(false);
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
    // Contenido del botón considerando estado de carga
    const buttonContent = isLoading ? (
      <>
        <Loader2 size={iconSize} className="animate-spin" />
        <span className="sr-only">Cargando opciones de calendario</span>
      </>
    ) : (
      <>
        <Calendar size={iconSize} />
        {buttonStyle !== "icon" && <span className="ml-2">Agregar al calendario</span>}
      </>
    );
    
    // Renderizar botón con tooltip para mejor accesibilidad
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant={buttonStyle === "full" ? "outline" : "ghost"} 
              size={buttonStyle === "icon" ? "icon" : "sm"}
              onClick={() => setIsOpen(true)}
              aria-label="Agregar cita al calendario"
            >
              {buttonContent}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Agregar cita al calendario</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
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
            <Loader2 className="animate-spin h-5 w-5 mx-auto mb-2" />
            <p>Cargando opciones...</p>
          </div>
        ) : hasError ? (
          <div className="px-2 py-4 text-center text-sm text-destructive">
            <AlertCircle className="h-5 w-5 mx-auto mb-2" />
            <p>No se pudieron cargar las opciones</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => {
                setHasError(false);
                setIsOpen(true);
              }}
            >
              Reintentar
            </Button>
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