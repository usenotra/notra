import { requireAuth } from "@/actions/auth";
import { DashboardClientWrapper } from "@/components/dashboard/dashboard-client-wrapper";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();

  return <DashboardClientWrapper>{children}</DashboardClientWrapper>;
}
