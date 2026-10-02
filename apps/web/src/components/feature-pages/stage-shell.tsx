import { cn } from "@notra/ui/lib/utils";

import type { FeatureStageShellProps } from "@/types/feature-detail-page";

export function StageShell({
  image,
  className,
  children,
}: FeatureStageShellProps) {
  return (
    <div
      className={cn(
        "w-full overflow-clip rounded-3xl bg-cover bg-center p-4 text-left sm:p-8 lg:p-16",
        className
      )}
      style={{ backgroundImage: `url(${image})` }}
    >
      {children}
    </div>
  );
}
