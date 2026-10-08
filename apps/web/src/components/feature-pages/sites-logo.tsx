import { cn } from "@notra/ui/lib/utils";

import type { SitesLogoProps } from "@/types/sites-page";

export function SitesLogo({ platform, className }: SitesLogoProps) {
  const { Icon, src, name } = platform;

  if (Icon) {
    return <Icon aria-hidden="true" className={cn("shrink-0", className)} />;
  }

  return (
    <img
      alt=""
      className={cn("shrink-0 object-contain", className)}
      height={20}
      src={src}
      width={20}
      title={name}
    />
  );
}
