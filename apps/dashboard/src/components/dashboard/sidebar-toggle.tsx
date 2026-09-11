"use client";

import {
  SidebarLeft01Icon,
  SidebarRight01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";
import { useSidebar } from "@notra/ui/components/ui/sidebar";
import { cn } from "@notra/ui/lib/utils";
import type { ComponentProps } from "react";

export function SidebarToggle({
  className,
  onClick,
  ...props
}: ComponentProps<typeof Button>) {
  const { isMobile, open, openMobile, toggleSidebar } = useSidebar();
  const isOpen = isMobile ? openMobile : open;

  return (
    <Button
      aria-expanded={isOpen}
      aria-label={isOpen ? "Hide sidebar" : "Show sidebar"}
      className={cn(
        "hover:bg-muted aria-expanded:hover:bg-muted dark:hover:bg-muted/50 dark:aria-expanded:hover:bg-muted/50 cursor-pointer bg-transparent aria-expanded:bg-transparent",
        className
      )}
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      size="icon-sm"
      variant="ghost"
      {...props}
    >
      <HugeiconsIcon
        icon={isOpen ? SidebarLeft01Icon : SidebarRight01Icon}
        strokeWidth={1.8}
      />
    </Button>
  );
}
