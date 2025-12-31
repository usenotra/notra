import type { Metadata } from "next";
import { requireAuth } from "@/actions/auth";
import { DashboardClientWrapper } from "@/components/dashboard/dashboard-client-wrapper";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage your dashboard and projects efficiently",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();

  return <DashboardClientWrapper>{children}</DashboardClientWrapper>;
}
