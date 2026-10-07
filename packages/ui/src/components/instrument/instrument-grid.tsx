import { cn } from "@notra/ui/lib/utils";
import type { InstrumentGridProps } from "@notra/ui/types/instrument";

export function InstrumentGrid({ children, className }: InstrumentGridProps) {
  return <div className={cn("grid gap-3", className)}>{children}</div>;
}
