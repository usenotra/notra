import { cn } from "@/lib/utils";
import type { SidebarLabelProps } from "@/types/components/sidebar-label";

export function SidebarLabel({ children, className }: SidebarLabelProps) {
  return (
    <span className={cn("min-w-0 whitespace-nowrap", className)}>
      <span
        className="duration-fast inline-block transition-[opacity,transform] ease-(--sidebar-ease) group-data-[collapsible=icon]:translate-x-0.5 group-data-[collapsible=icon]:opacity-0 motion-reduce:transition-none"
        data-slot="sidebar-label"
      >
        {children}
      </span>
    </span>
  );
}
