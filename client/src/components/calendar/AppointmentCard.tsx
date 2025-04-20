import React from "react";
import { format, addMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import CalendarExportMenu from "@/components/calendar/CalendarExportMenu";
import { Appointment } from "@shared/schema";

interface AppointmentCardProps {
  appointment: Appointment;
  getPatientName: (id: number) => string;
  onUpdateStatus: (id: number, status: string) => void;
  isPending: boolean;
  isPast?: boolean;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  getPatientName,
  onUpdateStatus,
  isPending,
  isPast = false
}) => {
  
  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-800">Programada</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completada</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelada</Badge>;
      case 'missed':
        return <Badge className="bg-yellow-100 text-yellow-800">Ausente</Badge>;
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-800">Pendiente</Badge>;
      case 'approved':
        return <Badge className="bg-cyan-100 text-cyan-800">Aprobada</Badge>;
      default:
        return <Badge>Desconocido</Badge>;
    }
  };
  
  // Render status with export button
  const renderStatusWithExport = (appointment: Appointment) => {
    return (
      <div className="flex items-center gap-2">
        {(appointment.status === 'scheduled' || appointment.status === 'approved' || appointment.status === 'pending') && (
          <CalendarExportMenu appointmentId={appointment.id} buttonStyle="icon" iconSize={16} />
        )}
        {getStatusBadge(appointment.status)}
      </div>
    );
  };

  // Get background color for date column
  const getDateBgColor = () => {
    if (isPast) {
      return appointment.status === 'completed' ? 'bg-green-50' : 
             appointment.status === 'cancelled' ? 'bg-red-50' : 'bg-yellow-50';
    }
    return 'bg-primary-50';
  };

  // Get text color for date column
  const getDateTextColor = () => {
    if (isPast) {
      return appointment.status === 'completed' ? 'text-green-800' : 
             appointment.status === 'cancelled' ? 'text-red-800' : 'text-yellow-800';
    }
    return 'text-primary-800';
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        <div className={`sm:w-24 flex flex-col items-center justify-center p-4 text-center ${getDateBgColor()}`}>
          <span className={`text-sm font-medium ${getDateTextColor()}`}>
            {format(new Date(appointment.date), "EEE", { locale: es })}
          </span>
          <span className={`text-2xl font-bold ${getDateTextColor()}`}>
            {format(new Date(appointment.date), "dd", { locale: es })}
          </span>
          <span className={`text-sm ${getDateTextColor()}`}>
            {format(new Date(appointment.date), "MMM", { locale: es })}
          </span>
        </div>
        <div className="flex-1 p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-lg font-medium">
                {getPatientName(appointment.patient_id)}
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {format(new Date(appointment.date), "HH:mm", { locale: es })} - 
                  {format(addMinutes(new Date(appointment.date), appointment.duration), "HH:mm", { locale: es })}
                </span>
                <span className="mx-1">•</span>
                <span>{appointment.duration} minutos</span>
              </div>
            </div>
            {renderStatusWithExport(appointment)}
          </div>
          {appointment.notes && (
            <p className="text-sm mt-2 text-muted-foreground">
              {appointment.notes}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {!isPast && appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onUpdateStatus(appointment.id, 'completed')}
                  disabled={isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Completada
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onUpdateStatus(appointment.id, 'cancelled')}
                  disabled={isPending}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onUpdateStatus(appointment.id, 'missed')}
                  disabled={isPending}
                >
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Ausente
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AppointmentCard;