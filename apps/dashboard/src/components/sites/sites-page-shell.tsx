import { PageContainer } from "@/components/layout/container";
import type { SitesPageShellProps } from "@/types/components/sites";

export function SitesPageShell({ children }: SitesPageShellProps) {
  return (
    <PageContainer
      className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6"
      variant="default"
    >
      <div className="w-full space-y-6 px-4 has-[[data-site-editor]]:flex has-[[data-site-editor]]:min-h-0 has-[[data-site-editor]]:flex-1 has-[[data-site-editor]]:flex-col has-[[data-site-fill]]:flex has-[[data-site-fill]]:flex-1 has-[[data-site-fill]]:flex-col lg:px-6">
        {children}
      </div>
    </PageContainer>
  );
}
