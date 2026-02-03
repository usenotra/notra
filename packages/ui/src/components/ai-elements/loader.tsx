import type { HTMLAttributes } from "react";
import { Loader2Icon } from "lucide-react";
import { cn } from "@notra/ui/lib/utils";

export type LoaderProps = HTMLAttributes<HTMLDivElement> & {
  size?: number;
};

export const Loader = ({ className, size = 16, ...props }: LoaderProps) => (
  <div
    className={cn("inline-flex items-center justify-center", className)}
    {...props}
  >
    <Loader2Icon className="animate-spin" size={size} />
  </div>
);
