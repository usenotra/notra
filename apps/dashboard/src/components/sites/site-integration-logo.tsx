import { cn } from "@/lib/utils";
import type { SiteIntegrationLogoProps } from "@/types/components/sites";

export function SiteIntegrationLogo({
  provider,
  className,
}: SiteIntegrationLogoProps) {
  const Logo = provider.logo;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-background flex size-9 shrink-0 items-center justify-center rounded-lg border",
        className
      )}
    >
      {Logo ? (
        <Logo className="size-4.5" />
      ) : (
        <span className="text-sm font-semibold">{provider.name.charAt(0)}</span>
      )}
    </span>
  );
}
