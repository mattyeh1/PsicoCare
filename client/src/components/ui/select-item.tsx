import * as React from "react";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  SelectItemProps, 
  Command
} from "cmdk";

const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof Command.Item> & { value: string }
>(({ className, children, value, ...props }, ref) => {
  return (
    <Command.Item
      ref={ref}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
      value={value}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <CheckIcon className="h-4 w-4" />
      </span>
      <span className="truncate">{children}</span>
    </Command.Item>
  );
});

SelectItem.displayName = "SelectItem";

export { SelectItem };
