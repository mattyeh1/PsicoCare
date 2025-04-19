import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

interface TimeSlotsProps {
  date: Date;
  slots: string[];
  disabledSlots?: string[];
  onSelectSlot?: (slot: string) => void;
}

const TimeSlots = ({
  date,
  slots,
  disabledSlots = [],
  onSelectSlot,
}: TimeSlotsProps) => {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const handleSlotClick = (slot: string) => {
    if (disabledSlots.includes(slot)) return;
    
    setSelectedSlot(slot);
    if (onSelectSlot) {
      onSelectSlot(slot);
    }
  };

  if (slots.length === 0) {
    return (
      <div className="py-6 text-center">
        <Clock className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-2 text-lg font-medium text-foreground">
          No hay horarios disponibles
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          No hay horarios disponibles para esta fecha. Por favor selecciona otro día.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-foreground">
        Horarios disponibles para el {date.toLocaleDateString("es-ES", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}:
      </h3>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {slots.map((slot) => {
          const isDisabled = disabledSlots.includes(slot);
          const isSelected = selectedSlot === slot;
          
          return (
            <Button
              key={slot}
              variant="outline"
              size="sm"
              className={cn(
                "py-2 px-2 text-center text-sm flex justify-center",
                isDisabled && "bg-muted text-muted-foreground cursor-not-allowed",
                isSelected && !isDisabled && "bg-primary text-primary-foreground",
                !isDisabled && !isSelected && "time-slot hover:cursor-pointer"
              )}
              onClick={() => handleSlotClick(slot)}
              disabled={isDisabled}
            >
              {slot}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default TimeSlots;
