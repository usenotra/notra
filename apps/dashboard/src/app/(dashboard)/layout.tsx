import type { Metadata } from "next";
import { DashboardClientWrapper } from "@/components/dashboard/dashboard-client-wrapper";
import { requireAuth } from "@/lib/auth/actions";

export const metadata: Metadata = {
  title: {
    template: "%s | Notra",
    default: "Dashboard",
  },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();

  return <DashboardClientWrapper>{children}</DashboardClientWrapper>;
}
