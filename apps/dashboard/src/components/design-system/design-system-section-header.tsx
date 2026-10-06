import { DESIGN_SYSTEM_CATALOG_BY_ID } from "@/constants/design-system-catalog";
import { cn } from "@/lib/utils";

export function DesignSystemSectionHeader({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description?: string;
}) {
  const entry = DESIGN_SYSTEM_CATALOG_BY_ID[id];
  const isChild = entry?.depth === 1;
  const Heading = isChild ? "h4" : "h3";

  return (
    <div className={cn("max-w-2xl", isChild ? "space-y-0.5" : "space-y-1.5")}>
      <Heading
        className={cn(
          "flex items-baseline gap-2.5 font-semibold tracking-tight text-balance",
          isChild ? "text-base" : "text-xl"
        )}
      >
        {entry?.number ? (
          <span className="text-muted-foreground font-mono text-xs font-normal tabular-nums">
            {entry.number}
          </span>
        ) : null}
        {title}
      </Heading>
      {description ? (
        <p className="text-muted-foreground text-sm text-pretty">
          {description}
        </p>
      ) : null}
    </div>
  );
}
