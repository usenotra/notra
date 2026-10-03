import type { ReactNode } from "react";

import { PageContainer } from "@/components/layout/container";

export function SitesPageShell({ children }: { children: ReactNode }) {
  return (
    <PageContainer
      className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6"
      variant="default"
    >
      <div className="w-full space-y-6 px-4 lg:px-6">{children}</div>
    </PageContainer>
  );
}
