"use client";

import { SidebarInset, SidebarProvider } from "@notra/ui/components/ui/sidebar";
import type { ReactNode } from "react";

import { DesignSystemSidebar } from "@/components/design-system/design-system-sidebar";
import { DesignSystemTopbar } from "@/components/design-system/design-system-topbar";
import { DESIGN_SYSTEM_CATALOG } from "@/constants/design-system-catalog";
import { useActiveSection } from "@/hooks/use-active-section";

const SECTION_IDS = DESIGN_SYSTEM_CATALOG.map((entry) => entry.id);

export function DesignSystemFrame({
  title,
  description,
  children,
}: {
  title: string;
  description: ReactNode;
  children: ReactNode;
}) {
  const activeId = useActiveSection(SECTION_IDS);

  return (
    <div className="bg-sidebar h-svh overflow-hidden">
      <SidebarProvider className="h-full min-h-0!" defaultOpen>
        <DesignSystemSidebar activeId={activeId} />
        <SidebarInset className="min-h-0 min-w-0 scroll-pt-14 overflow-y-auto overscroll-contain">
          <DesignSystemTopbar activeId={activeId} />
          <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-16 px-6 py-10 lg:px-10">
            <header className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-balance">
                {title}
              </h1>
              <p className="text-muted-foreground max-w-2xl text-base text-pretty">
                {description}
              </p>
            </header>
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
