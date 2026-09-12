import type { Metadata } from "next";

import { requireAuthIdentity } from "@/lib/auth/actions";

export const instant = false;

export const metadata: Metadata = {
  title: {
    template: "%s - Notra",
    default: "Dashboard",
  },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuthIdentity();

  return children;
}
