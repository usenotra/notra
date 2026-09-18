import type { Metadata } from "next";

export const instant = false;

export const metadata: Metadata = {
  title: {
    template: "%s - Notra",
    default: "Dashboard",
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The proxy gates the session; the [slug] layout checks membership and bans.
  return children;
}
