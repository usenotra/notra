import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { AutumnOrgProvider } from "@/components/providers/autumn-org-provider";
import { DatabaseProvider } from "@/components/providers/database-provider";

export default function DesignSystemLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  // Previews render real dashboard components (e.g. the chat input), which
  // read billing state and synced collections like the dashboard does.
  return (
    <DatabaseProvider>
      <AutumnOrgProvider>{children}</AutumnOrgProvider>
    </DatabaseProvider>
  );
}
