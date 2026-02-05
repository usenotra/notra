"use client";

import { SidebarInset, SidebarProvider } from "@notra/ui/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/app-sidebar";
import { SiteHeader } from "@/components/dashboard/header";
import { OrganizationsProvider } from "@/components/providers/organization-provider";

interface DashboardClientWrapperProps {
  children: React.ReactNode;
}

export function DashboardClientWrapper({
  children,
}: DashboardClientWrapperProps) {
  return (
    <OrganizationsProvider>
      <SidebarProvider>
        <DashboardSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="@container/main flex flex-1 flex-col gap-2">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </OrganizationsProvider>
  );
}
